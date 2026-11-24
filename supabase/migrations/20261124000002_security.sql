-- =============================================================================
-- KEU DIRU — Migration 002 : rôles, RLS, garde-fous et modération
-- Statut : PROPOSÉ (non déployé). Réf. RM-01, 02, 13, 14, 15, 16, 18.
-- Principe : tout ce qui touche au statut de publication passe par des fonctions
-- SECURITY DEFINER atomiques, jamais par des écritures directes du frontend.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rôles : hiérarchie editor < moderator < admin
-- -----------------------------------------------------------------------------
create or replace function public.has_min_role(min_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and case ur.role when 'admin' then 3 when 'moderator' then 2 when 'editor' then 1 end
       >= case min_role when 'admin' then 3 when 'moderator' then 2 when 'editor' then 1 end
  )
$$;

-- Profil créé automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), 60), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Audit (append-only, écrit uniquement par triggers/fonctions)
-- -----------------------------------------------------------------------------
create or replace function public.write_audit(p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'))
$$;
revoke all on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.audit_resource_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit('resource.created', 'resource', new.id::text, jsonb_build_object('status', new.status));
  elsif new.status is distinct from old.status then
    perform public.write_audit('resource.status_changed', 'resource', new.id::text,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;
create trigger trg_resources_audit after insert or update of status on public.resources
  for each row execute function public.audit_resource_status();

-- published_at cohérent avec le statut
create or replace function public.resources_publication_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;
create trigger trg_resources_publication before insert or update of status on public.resources
  for each row execute function public.resources_publication_guard();

-- Suppression physique réservée aux admins ET journalisée (RM-18 : préférer withdrawn/archived)
create or replace function public.audit_resource_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.write_audit('resource.deleted', 'resource', old.id::text, to_jsonb(old));
  return old;
end;
$$;
create trigger trg_resources_delete_audit before delete on public.resources
  for each row execute function public.audit_resource_delete();

-- -----------------------------------------------------------------------------
-- Contributions : garde-fous côté base
-- -----------------------------------------------------------------------------
create or replace function public.contributions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  open_count int;
  is_staff boolean := public.has_min_role('editor');
begin
  if tg_op = 'INSERT' then
    if not is_staff then
      -- un membre ne peut pas s'auto-approuver ni soumettre au nom d'autrui
      new.status := 'pending';
      new.submitted_by := auth.uid();
      new.resulting_resource_id := null;
      new.duplicate_candidates := '{}';
      -- anti-flood : 20 contributions ouvertes max par membre (valeur à arbitrer)
      select count(*) into open_count from public.contributions
       where submitted_by = auth.uid() and status in ('pending', 'needs_changes');
      if open_count >= 20 then
        raise exception 'too_many_open_contributions' using errcode = 'P0001';
      end if;
    end if;
    -- signalement des doublons probables (jamais de rejet automatique — RM-06)
    if new.payload ? 'url' then
      select coalesce(array_agg(r.id), '{}') into new.duplicate_candidates
        from public.resources r
       where r.url_normalized = public.normalize_url(new.payload->>'url')
         and r.status in ('draft', 'published');
    end if;
    return new;
  end if;

  -- UPDATE
  if not is_staff then
    if old.submitted_by <> auth.uid() then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    -- transitions autorisées au contributeur : needs_changes -> pending (resoumission),
    -- pending|needs_changes -> withdrawn. Rien d'autre.
    if new.status is distinct from old.status and not (
         (old.status = 'needs_changes' and new.status = 'pending') or
         (old.status in ('pending', 'needs_changes') and new.status = 'withdrawn')) then
      raise exception 'invalid_status_transition' using errcode = 'P0001';
    end if;
    if old.status not in ('pending', 'needs_changes') then
      raise exception 'contribution_locked' using errcode = 'P0001';
    end if;
    new.submitted_by := old.submitted_by;
    new.kind := old.kind;
    new.target_resource_id := old.target_resource_id;
    new.resulting_resource_id := old.resulting_resource_id;
    new.duplicate_candidates := old.duplicate_candidates;
  end if;
  return new;
end;
$$;
create trigger trg_contributions_guard before insert or update on public.contributions
  for each row execute function public.contributions_guard();

-- -----------------------------------------------------------------------------
-- Modération atomique (§7) — seul chemin pour publier une contribution
-- -----------------------------------------------------------------------------
create or replace function public.review_contribution(
  p_contribution_id uuid,
  p_decision public.review_decision,
  p_comment text default null
)
returns uuid  -- id de la ressource créée/modifiée si approuvée, sinon null
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contributions%rowtype;
  p jsonb;
  v_resource_id uuid;
  v_lang text;
  v_type smallint;
  v_disc smallint;
begin
  if not public.has_min_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into c from public.contributions where id = p_contribution_id for update;
  if not found then raise exception 'contribution_not_found' using errcode = 'P0002'; end if;
  if c.status <> 'pending' then raise exception 'contribution_not_pending' using errcode = 'P0001'; end if;
  if c.submitted_by = auth.uid() then
    raise exception 'cannot_review_own_contribution' using errcode = '42501'; -- séparation des tâches
  end if;

  insert into public.contribution_reviews (contribution_id, reviewer_id, decision, comment)
  values (c.id, auth.uid(), p_decision, p_comment);

  if p_decision <> 'approved' then
    update public.contributions set status = p_decision::text::public.contribution_status where id = c.id;
    perform public.write_audit('contribution.' || p_decision::text, 'contribution', c.id::text,
      jsonb_build_object('comment', p_comment));
    return null;
  end if;

  p := c.payload;
  v_lang := nullif(p->>'language', '');
  select id into v_type from public.resource_types where slug = p->>'type';
  select id into v_disc from public.disciplines where slug = p->>'discipline';
  if v_type is null or v_disc is null then
    raise exception 'invalid_taxonomy_in_payload' using errcode = '22023';
  end if;

  if c.kind = 'new_resource' then
    insert into public.resources (slug, url, access_note, type_id, discipline_id, original_language,
                                  level, access_cost, author, publisher, license, license_url,
                                  formats, status, submitted_by)
    values (
      p->>'slug', nullif(p->>'url', ''), nullif(p->>'access_note', ''), v_type, v_disc, v_lang,
      coalesce(nullif(p->>'level', ''), 'unknown')::public.resource_level,
      coalesce(nullif(p->>'access_cost', ''), 'unknown')::public.access_cost,
      nullif(p->>'author', ''), nullif(p->>'publisher', ''), nullif(p->>'license', ''), nullif(p->>'license_url', ''),
      coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'formats', '[]')) x), '{}'),
      'published', c.submitted_by)
    returning id into v_resource_id;

    insert into public.resource_translations (resource_id, language, title, description, is_original)
    values (v_resource_id, coalesce(v_lang, 'fr'), p->>'title', p->>'description', v_lang is not null);
  else
    v_resource_id := c.target_resource_id;
    update public.resources set
      url         = coalesce(nullif(p->>'url', ''), url),
      type_id     = v_type,
      discipline_id = v_disc,
      level       = coalesce(nullif(p->>'level', '')::public.resource_level, level),
      access_cost = coalesce(nullif(p->>'access_cost', '')::public.access_cost, access_cost),
      author      = coalesce(nullif(p->>'author', ''), author),
      publisher   = coalesce(nullif(p->>'publisher', ''), publisher),
      license     = coalesce(nullif(p->>'license', ''), license)
    where id = v_resource_id;
  end if;

  update public.contributions set status = 'approved', resulting_resource_id = v_resource_id where id = c.id;
  perform public.write_audit('contribution.approved', 'contribution', c.id::text,
    jsonb_build_object('resource_id', v_resource_id));
  return v_resource_id;
end;
$$;
revoke all on function public.review_contribution(uuid, public.review_decision, text) from public, anon;
grant execute on function public.review_contribution(uuid, public.review_decision, text) to authenticated;

-- Gestion des rôles : admin uniquement, journalisée
create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_min_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user_id, p_role, auth.uid())
    on conflict do nothing;
  else
    if p_user_id = auth.uid() and p_role = 'admin' then
      raise exception 'cannot_revoke_own_admin' using errcode = 'P0001'; -- évite de verrouiller la plateforme
    end if;
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;
  perform public.write_audit(case when p_grant then 'role.granted' else 'role.revoked' end,
    'user', p_user_id::text, jsonb_build_object('role', p_role));
end;
$$;
revoke all on function public.set_user_role(uuid, public.app_role, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role, boolean) to authenticated;

-- Favori uniquement sur ressource publiée (RM-13)
create or replace function public.favorites_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.resources where id = new.resource_id and status = 'published') then
    raise exception 'resource_not_published' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_favorites_guard before insert on public.favorites
  for each row execute function public.favorites_guard();

-- -----------------------------------------------------------------------------
-- Privilèges de base (Supabase accorde déjà ces droits par défaut ; explicites ici)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
-- tables jamais écrites directement par l'API
revoke insert, update, delete on public.audit_log, public.contribution_reviews, public.user_roles from authenticated;
revoke select on public.audit_log from anon;

-- -----------------------------------------------------------------------------
-- RLS — activée sur TOUTES les tables exposées (RM-16)
-- -----------------------------------------------------------------------------
alter table public.languages             enable row level security;
alter table public.profiles              enable row level security;
alter table public.user_roles            enable row level security;
alter table public.disciplines           enable row level security;
alter table public.topics                enable row level security;
alter table public.resource_types        enable row level security;
alter table public.tags                  enable row level security;
alter table public.resources             enable row level security;
alter table public.resource_translations enable row level security;
alter table public.resource_topics       enable row level security;
alter table public.resource_tags         enable row level security;
alter table public.collections           enable row level security;
alter table public.collection_items      enable row level security;
alter table public.learning_paths        enable row level security;
alter table public.learning_path_steps   enable row level security;
alter table public.favorites             enable row level security;
alter table public.learning_progress     enable row level security;
alter table public.contributions         enable row level security;
alter table public.contribution_reviews  enable row level security;
alter table public.audit_log             enable row level security;

-- Référentiels : lecture publique, écriture éditeur+
do $$
declare t text;
begin
  foreach t in array array['languages', 'disciplines', 'topics', 'resource_types', 'tags'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.has_min_role(''editor'')) with check (public.has_min_role(''editor''))', t || '_write', t);
  end loop;
end $$;

-- Profils : chacun voit/modifie le sien ; modérateurs en lecture
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_min_role('moderator'));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Rôles : on voit les siens ; admin voit tout ; écriture via set_user_role() uniquement
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_min_role('admin'));

-- Ressources (RM-01)
create policy resources_read on public.resources for select to anon, authenticated
  using (status = 'published' or public.has_min_role('editor'));
create policy resources_insert on public.resources for insert to authenticated
  with check (public.has_min_role('editor'));
create policy resources_update on public.resources for update to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));
create policy resources_delete on public.resources for delete to authenticated
  using (public.has_min_role('admin'));

-- Tables filles : visibles si la ressource parente l'est
create policy translations_read on public.resource_translations for select to anon, authenticated
  using (exists (select 1 from public.resources r where r.id = resource_id
                 and (r.status = 'published' or public.has_min_role('editor'))));
create policy translations_write on public.resource_translations for all to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));

create policy resource_topics_read on public.resource_topics for select to anon, authenticated
  using (exists (select 1 from public.resources r where r.id = resource_id
                 and (r.status = 'published' or public.has_min_role('editor'))));
create policy resource_topics_write on public.resource_topics for all to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));

create policy resource_tags_read on public.resource_tags for select to anon, authenticated
  using (exists (select 1 from public.resources r where r.id = resource_id
                 and (r.status = 'published' or public.has_min_role('editor'))));
create policy resource_tags_write on public.resource_tags for all to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));

-- Collections & parcours : publiés visibles ; création réservée aux éditeurs (RM-11 — à arbitrer)
create policy collections_read on public.collections for select to anon, authenticated
  using (status = 'published' or owner_id = auth.uid() or public.has_min_role('editor'));
create policy collections_write on public.collections for all to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));
create policy collection_items_read on public.collection_items for select to anon, authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id
                 and (c.status = 'published' or public.has_min_role('editor')))
         and exists (select 1 from public.resources r where r.id = resource_id
                 and (r.status = 'published' or public.has_min_role('editor'))));
create policy collection_items_write on public.collection_items for all to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));

create policy paths_read on public.learning_paths for select to anon, authenticated
  using (status = 'published' or owner_id = auth.uid() or public.has_min_role('editor'));
create policy paths_write on public.learning_paths for all to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));
create policy steps_read on public.learning_path_steps for select to anon, authenticated
  using (exists (select 1 from public.learning_paths lp where lp.id = path_id
                 and (lp.status = 'published' or public.has_min_role('editor'))));
create policy steps_write on public.learning_path_steps for all to authenticated
  using (public.has_min_role('editor')) with check (public.has_min_role('editor'));

-- Favoris & progression : strictement privés (RM-12, RM-13, RM-14)
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_own on public.learning_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Contributions (RM-02)
create policy contributions_insert on public.contributions for insert to authenticated
  with check (submitted_by = auth.uid());
create policy contributions_read on public.contributions for select to authenticated
  using (submitted_by = auth.uid() or public.has_min_role('editor'));
create policy contributions_update on public.contributions for update to authenticated
  using (submitted_by = auth.uid() or public.has_min_role('editor'))
  with check (submitted_by = auth.uid() or public.has_min_role('editor'));

create policy reviews_read on public.contribution_reviews for select to authenticated
  using (public.has_min_role('editor') or exists (
    select 1 from public.contributions c where c.id = contribution_id and c.submitted_by = auth.uid()));

create policy audit_read on public.audit_log for select to authenticated
  using (public.has_min_role('moderator'));
