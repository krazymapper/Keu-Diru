-- =============================================================================
-- KEU DIRU — Migration 001 : schéma initial
-- Statut : PROPOSÉ (non déployé). Réf. 01_CONSOLIDATION §8, §10 ; 03_AUDIT §3.
-- Réversible : voir supabase/rollback/20261124000001_down.sql
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
-- Sans ce GRANT, la recherche publique (anon) échoue : "permission denied for schema extensions"
-- (bug détecté en test ; Supabase l'accorde normalement, on ne s'y fie pas).
grant usage on schema extensions to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Types énumérés (noms techniques normalisés — 01 §7)
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('editor', 'moderator', 'admin');
-- "member" n'est PAS un rôle stocké : tout utilisateur authentifié est membre.

create type public.resource_status as enum ('draft', 'published', 'archived', 'withdrawn');
create type public.contribution_status as enum ('pending', 'needs_changes', 'approved', 'rejected', 'withdrawn');
create type public.contribution_kind as enum ('new_resource', 'edit_resource');
create type public.review_decision as enum ('approved', 'needs_changes', 'rejected');
create type public.link_status as enum ('ok', 'restricted', 'temporarily_unreachable', 'broken', 'unverified'); -- RM-08
create type public.resource_level as enum ('beginner', 'intermediate', 'advanced', 'all_levels', 'unknown');
create type public.access_cost as enum ('free', 'freemium', 'paid', 'institutional', 'unknown');
create type public.editorial_status as enum ('draft', 'published', 'archived');

-- -----------------------------------------------------------------------------
-- Utilitaires immuables
-- -----------------------------------------------------------------------------
-- unaccent() n'est pas IMMUTABLE : on l'encapsule pour pouvoir l'utiliser dans
-- une colonne générée / un index (bug classique : "generation expression is not immutable").
create or replace function public.immutable_unaccent(input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, input) $$;

-- Normalisation d'URL pour la détection de doublons (RM-06).
-- Miroir TS : src/lib/url.ts — parité vérifiée par tests/url-parity.test.ts.
create or replace function public.normalize_url(raw text)
returns text
language plpgsql
immutable
parallel safe
strict
set search_path = ''
as $$
declare
  u text := btrim(raw);
  scheme_host text;
  rest text;
  query text;
  kept text[] := '{}';
  part text;
begin
  -- retire le fragment
  u := split_part(u, '#', 1);
  -- schéma + hôte en minuscules, sans "www.", http/https confondus
  scheme_host := lower(substring(u from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]+'));
  if scheme_host is null then
    return lower(u);
  end if;
  rest := substring(u from length(scheme_host) + 1);
  scheme_host := regexp_replace(scheme_host, '^https?://', '');
  scheme_host := regexp_replace(scheme_host, '^www\.', '');
  scheme_host := regexp_replace(scheme_host, ':(80|443)$', '');
  -- requête : retire les paramètres de traçage, trie le reste
  query := nullif(split_part(rest, '?', 2), '');
  rest := split_part(rest, '?', 1);
  if query is not null then
    foreach part in array string_to_array(query, '&') loop
      if part <> '' and part !~* '^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref)(=|$)' then
        kept := kept || part;
      end if;
    end loop;
    select coalesce(array_agg(p order by p collate "C"), '{}') into kept from unnest(kept) p; -- tri binaire (parité TS)
  end if;
  rest := regexp_replace(rest, '/+$', '');
  return scheme_host || rest || case when cardinality(kept) > 0 then '?' || array_to_string(kept, '&') else '' end;
end;
$$;

-- Configuration FTS par langue de contenu (racinisation). Langue inconnue => 'simple'.
create or replace function public.ts_config_for(lang text)
returns regconfig
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case lang
    when 'fr' then 'pg_catalog.french'::regconfig
    when 'en' then 'pg_catalog.english'::regconfig
    when 'es' then 'pg_catalog.spanish'::regconfig
    when 'pt' then 'pg_catalog.portuguese'::regconfig
    else 'pg_catalog.simple'::regconfig end
$$;

-- Les libellés de taxonomie sont des objets {"fr": "...", "en": "...", ...}
-- (extensible sans migration — RM-10). FR et EN obligatoires pour le MVP.
create or replace function public.is_valid_labels(labels jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select jsonb_typeof(labels) = 'object'
     and labels ? 'fr' and labels ? 'en'
     and length(btrim(labels->>'fr')) > 0
     and length(btrim(labels->>'en')) > 0
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$ begin new.updated_at := now(); return new; end; $$;

-- -----------------------------------------------------------------------------
-- Langues (RM-09 / RM-10) — langue d'interface ≠ langue de contenu
-- -----------------------------------------------------------------------------
create table public.languages (
  code          text primary key check (code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),  -- BCP-47 simplifié
  native_name   text not null,
  is_ui_language boolean not null default false
);

-- -----------------------------------------------------------------------------
-- Profils et rôles — le rôle n'est PAS dans profiles (anti-escalade de privilèges)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text check (display_name is null or length(display_name) between 2 and 60),
  preferred_locale text not null default 'fr' references public.languages (code),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- -----------------------------------------------------------------------------
-- Taxonomies
-- -----------------------------------------------------------------------------
create table public.disciplines (
  id         smallint generated always as identity primary key,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  labels     jsonb not null check (public.is_valid_labels(labels)),
  icon       text,
  sort_order smallint not null default 0
);

create table public.topics (
  id            int generated always as identity primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  discipline_id smallint references public.disciplines (id) on delete set null, -- null = transversal
  labels        jsonb not null check (public.is_valid_labels(labels))
);

create table public.resource_types (
  id     smallint generated always as identity primary key,
  slug   text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  labels jsonb not null check (public.is_valid_labels(labels))
);

create table public.tags (
  id   int generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- -----------------------------------------------------------------------------
-- Ressources
-- -----------------------------------------------------------------------------
create table public.resources (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  url               text check (url is null or url ~* '^https?://'),
  url_normalized    text generated always as (public.normalize_url(url)) stored,
  access_note       text,  -- RM-03 : ressource sans URL (locale) => note d'accès obligatoire
  type_id           smallint not null references public.resource_types (id),
  discipline_id     smallint not null references public.disciplines (id),
  original_language text references public.languages (code), -- null = inconnue (ne pas inventer)
  level             public.resource_level not null default 'unknown',
  access_cost       public.access_cost not null default 'unknown',
  author            text,   -- null = non renseigné (RM-04)
  publisher         text,
  license           text,
  license_url       text check (license_url is null or license_url ~* '^https?://'),
  content_date      date,   -- date de publication / mise à jour de la ressource
  formats           text[] not null default '{}',
  status            public.resource_status not null default 'draft',
  link_status       public.link_status not null default 'unverified',
  link_checked_at   timestamptz,
  notes             text,
  submitted_by      uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  published_at      timestamptz,
  constraint resources_access_chk check (url is not null or length(btrim(coalesce(access_note, ''))) > 0),
  constraint resources_published_at_chk check (status <> 'published' or published_at is not null)
);

-- Doublon strict interdit entre ressources actives ; les contributions, elles,
-- sont seulement signalées (RM-06 : décision humaine).
create unique index resources_url_active_uniq
  on public.resources (url_normalized)
  where url_normalized is not null and status in ('draft', 'published');
create index resources_status_idx on public.resources (status);
create index resources_discipline_idx on public.resources (discipline_id) where status = 'published';
create index resources_type_idx on public.resources (type_id) where status = 'published';

create table public.resource_translations (
  resource_id  uuid not null references public.resources (id) on delete cascade,
  language     text not null references public.languages (code),
  title        text not null check (length(btrim(title)) between 3 and 300),
  description  text not null check (length(btrim(description)) between 20 and 5000),
  is_original  boolean not null default false,
  -- double indexation : 'simple' (mots exacts, toutes langues) + racinisée selon la langue
  search_vector tsvector generated always as (
    setweight(to_tsvector('pg_catalog.simple'::regconfig, public.immutable_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector(public.ts_config_for(language), public.immutable_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('pg_catalog.simple'::regconfig, public.immutable_unaccent(coalesce(description, ''))), 'B') ||
    setweight(to_tsvector(public.ts_config_for(language), public.immutable_unaccent(coalesce(description, ''))), 'B')
  ) stored,
  updated_at   timestamptz not null default now(),
  primary key (resource_id, language)
);
create unique index resource_translations_one_original
  on public.resource_translations (resource_id) where is_original;
create index resource_translations_fts_idx on public.resource_translations using gin (search_vector);
create index resource_translations_title_trgm_idx
  on public.resource_translations using gin (public.immutable_unaccent(lower(title)) extensions.gin_trgm_ops);

create table public.resource_topics (
  resource_id uuid not null references public.resources (id) on delete cascade,
  topic_id    int  not null references public.topics (id) on delete cascade,
  primary key (resource_id, topic_id)
);
create index resource_topics_topic_idx on public.resource_topics (topic_id);

create table public.resource_tags (
  resource_id uuid not null references public.resources (id) on delete cascade,
  tag_id      int  not null references public.tags (id) on delete cascade,
  primary key (resource_id, tag_id)
);

-- -----------------------------------------------------------------------------
-- Collections (RM-11) et parcours (RM-12)
-- -----------------------------------------------------------------------------
create table public.collections (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        jsonb not null check (public.is_valid_labels(title)),
  description  jsonb not null default '{}'::jsonb,
  status       public.editorial_status not null default 'draft',
  owner_id     uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  resource_id   uuid not null references public.resources (id) on delete cascade,
  position      int,           -- ordre éditorial facultatif (≠ progression)
  note          jsonb not null default '{}'::jsonb,
  primary key (collection_id, resource_id)
);

create table public.learning_paths (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       jsonb not null check (public.is_valid_labels(title)),
  objective   jsonb not null check (public.is_valid_labels(objective)),
  description jsonb not null default '{}'::jsonb,
  level       public.resource_level not null default 'unknown',
  status      public.editorial_status not null default 'draft',
  owner_id    uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.learning_path_steps (
  id          uuid primary key default gen_random_uuid(),
  path_id     uuid not null references public.learning_paths (id) on delete cascade,
  position    int  not null check (position > 0),
  resource_id uuid references public.resources (id) on delete restrict,
  instruction jsonb,
  constraint steps_content_chk check (resource_id is not null or instruction is not null),
  constraint steps_order_uniq unique (path_id, position) deferrable initially deferred
  -- DEFERRABLE : permet de réordonner des étapes dans une transaction sans collision.
);

-- -----------------------------------------------------------------------------
-- Données membres (privées — RM-13, RM-14)
-- -----------------------------------------------------------------------------
create table public.favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table public.learning_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  step_id      uuid not null references public.learning_path_steps (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id)
);

-- -----------------------------------------------------------------------------
-- Contributions et modération (§7)
-- -----------------------------------------------------------------------------
create table public.contributions (
  id                   uuid primary key default gen_random_uuid(),
  kind                 public.contribution_kind not null default 'new_resource',
  target_resource_id   uuid references public.resources (id) on delete set null,
  payload              jsonb not null check (jsonb_typeof(payload) = 'object'),
  status               public.contribution_status not null default 'pending',
  submitted_by         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  duplicate_candidates uuid[] not null default '{}',
  resulting_resource_id uuid references public.resources (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint contributions_kind_chk check (
    (kind = 'new_resource' and target_resource_id is null) or
    (kind = 'edit_resource' and target_resource_id is not null)
  )
);
create index contributions_status_idx on public.contributions (status, created_at);
create index contributions_submitter_idx on public.contributions (submitted_by);

create table public.contribution_reviews (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  reviewer_id     uuid references auth.users (id) on delete set null,
  decision        public.review_decision not null,
  comment         text,
  created_at      timestamptz not null default now(),
  constraint reviews_comment_chk check (decision = 'approved' or length(btrim(coalesce(comment, ''))) >= 10)
);

-- Journal d'audit append-only (RM-15, RM-18)
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text not null,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- updated_at
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_resources_updated before update on public.resources for each row execute function public.set_updated_at();
create trigger trg_translations_updated before update on public.resource_translations for each row execute function public.set_updated_at();
create trigger trg_collections_updated before update on public.collections for each row execute function public.set_updated_at();
create trigger trg_paths_updated before update on public.learning_paths for each row execute function public.set_updated_at();
create trigger trg_contributions_updated before update on public.contributions for each row execute function public.set_updated_at();
