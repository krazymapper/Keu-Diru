-- =============================================================================
-- KEU DIRU — Migration 003 : recherche catalogue (FTS + trigrammes)
-- SECURITY INVOKER : la RLS s'applique, un visiteur ne trouve que le publié.
-- Configuration 'simple' + unaccent : le catalogue mélange FR/EN (et d'autres
-- langues à venir) ; un dictionnaire unique 'french' casserait l'anglais.
-- =============================================================================

create or replace function public.search_resources(
  q              text default null,
  ui_lang        text default 'fr',
  p_discipline   text default null,
  p_type         text default null,
  p_level        public.resource_level default null,
  p_content_lang text default null,
  p_limit        int default 24,
  p_offset       int default 0
)
returns table (
  id uuid, slug text, url text, title text, description text, display_language text,
  original_language text, discipline text, resource_type text, level public.resource_level,
  access_cost public.access_cost, link_status public.link_status, rank real, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select nullif(btrim(q), '') as q_clean,
           case when nullif(btrim(q), '') is null then null
                else websearch_to_tsquery('pg_catalog.simple'::regconfig, public.immutable_unaccent(lower(btrim(q))))
                  || websearch_to_tsquery(public.ts_config_for(ui_lang), public.immutable_unaccent(lower(btrim(q)))) end as tsq,
           least(greatest(coalesce(p_limit, 24), 1), 100) as lim,
           greatest(coalesce(p_offset, 0), 0) as off
  ),
  matches as (
    select r.id,
           max(case when p.q_clean is null then 0
                    else ts_rank(t.search_vector, p.tsq)
                         + extensions.word_similarity(public.immutable_unaccent(lower(p.q_clean)),
                                                      public.immutable_unaccent(lower(t.title))) end) as rank
      from public.resources r
      join public.resource_translations t on t.resource_id = r.id
      join public.disciplines d on d.id = r.discipline_id
      join public.resource_types ty on ty.id = r.type_id
      cross join params p
     where r.status = 'published'
       and (p_discipline is null or d.slug = p_discipline)
       and (p_type is null or ty.slug = p_type)
       and (p_level is null or r.level = p_level)
       and (p_content_lang is null or r.original_language = p_content_lang)
       and (p.q_clean is null
            or t.search_vector @@ p.tsq
            or public.immutable_unaccent(lower(p.q_clean)) operator(extensions.<%) public.immutable_unaccent(lower(t.title)))
     group by r.id
  ),
  -- traduction affichée : langue d'interface > originale > n'importe laquelle (RM-09)
  best as (
    select distinct on (t.resource_id) t.resource_id, t.title, t.description, t.language
      from public.resource_translations t
      join matches m on m.id = t.resource_id
     order by t.resource_id, (t.language = ui_lang) desc, t.is_original desc, t.language
  )
  select r.id, r.slug, r.url, b.title, b.description, b.language, r.original_language,
         d.slug, ty.slug, r.level, r.access_cost, r.link_status, m.rank::real,
         count(*) over () as total_count
    from matches m
    join public.resources r on r.id = m.id
    join best b on b.resource_id = r.id
    join public.disciplines d on d.id = r.discipline_id
    join public.resource_types ty on ty.id = r.type_id
   order by m.rank desc, r.published_at desc nulls last, r.id
   limit (select lim from params) offset (select off from params)
$$;

grant execute on function public.search_resources(text, text, text, text, public.resource_level, text, int, int) to anon, authenticated;
