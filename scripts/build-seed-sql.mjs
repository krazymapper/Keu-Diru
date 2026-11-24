// Génère supabase/seed.sql à partir de data/seed/*.json (source unique de vérité).
// Usage : node scripts/build-seed-sql.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tax = JSON.parse(readFileSync(join(root, 'data/seed/taxonomy.json'), 'utf8'));
const cat = JSON.parse(readFileSync(join(root, 'data/seed/resources.json'), 'utf8'));

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (a) => `array[${(a ?? []).map(q).join(', ')}]::text[]`;

export function buildSeedSql() {
  const out = [
    '-- GÉNÉRÉ par scripts/build-seed-sql.mjs — ne pas éditer à la main.',
    '-- Données de démonstration : taxonomie PROPOSÉE, liens NON VÉRIFIÉS.',
    'begin;',
  ];
  for (const l of tax.languages)
    out.push(`insert into public.languages (code, native_name, is_ui_language) values (${q(l.code)}, ${q(l.native_name)}, ${l.is_ui_language}) on conflict (code) do nothing;`);
  tax.disciplines.forEach((d, i) =>
    out.push(`insert into public.disciplines (slug, labels, icon, sort_order) values (${q(d.slug)}, ${j(d.labels)}, ${q(d.icon)}, ${i + 1}) on conflict (slug) do nothing;`));
  for (const t of tax.resource_types)
    out.push(`insert into public.resource_types (slug, labels) values (${q(t.slug)}, ${j(t.labels)}) on conflict (slug) do nothing;`);
  for (const t of cat.topics)
    out.push(`insert into public.topics (slug, discipline_id, labels) values (${q(t.slug)}, ${t.discipline ? `(select id from public.disciplines where slug = ${q(t.discipline)})` : 'null'}, ${j(t.labels)}) on conflict (slug) do nothing;`);

  for (const r of cat.resources) {
    out.push(`insert into public.resources (slug, url, type_id, discipline_id, original_language, level, access_cost, author, publisher, license, formats, status, link_status, link_checked_at)
  values (${q(r.slug)}, ${q(r.url)}, (select id from public.resource_types where slug = ${q(r.type)}), (select id from public.disciplines where slug = ${q(r.discipline)}), ${q(r.original_language)}, ${q(r.level)}, ${q(r.access_cost)}, ${q(r.author)}, ${q(r.publisher)}, ${q(r.license)}, ${arr(r.formats)}, 'published', ${q(r.link_status ?? 'unverified')}, ${r.link_checked_at ? q(r.link_checked_at) + '::timestamptz' : 'null'})
  on conflict (slug) do nothing;`);
    for (const [lang, tr] of Object.entries(r.translations))
      out.push(`insert into public.resource_translations (resource_id, language, title, description, is_original) values ((select id from public.resources where slug = ${q(r.slug)}), ${q(lang)}, ${q(tr.title)}, ${q(tr.description)}, ${lang === r.original_language}) on conflict do nothing;`);
    for (const t of r.topics ?? [])
      out.push(`insert into public.resource_topics (resource_id, topic_id) select r.id, t.id from public.resources r, public.topics t where r.slug = ${q(r.slug)} and t.slug = ${q(t)} on conflict do nothing;`);
  }

  for (const c of cat.collections) {
    out.push(`insert into public.collections (slug, title, description, status) values (${q(c.slug)}, ${j(c.title)}, ${j(c.description)}, 'published') on conflict (slug) do nothing;`);
    c.items.forEach((slug, i) =>
      out.push(`insert into public.collection_items (collection_id, resource_id, position) select c.id, r.id, ${i + 1} from public.collections c, public.resources r where c.slug = ${q(c.slug)} and r.slug = ${q(slug)} on conflict do nothing;`));
  }
  for (const p of cat.learning_paths) {
    out.push(`insert into public.learning_paths (slug, title, objective, level, status) values (${q(p.slug)}, ${j(p.title)}, ${j(p.objective)}, ${q(p.level)}, 'published') on conflict (slug) do nothing;`);
    p.steps.forEach((s, i) =>
      out.push(`insert into public.learning_path_steps (path_id, position, resource_id, instruction) select lp.id, ${i + 1}, ${s.resource ? `(select id from public.resources where slug = ${q(s.resource)})` : 'null'}, ${s.instruction ? j(s.instruction) : 'null'} from public.learning_paths lp where lp.slug = ${q(p.slug)} and not exists (select 1 from public.learning_path_steps s where s.path_id = lp.id and s.position = ${i + 1});`));
    // NB : pas de ON CONFLICT ici — steps_order_uniq est DEFERRABLE (bug détecté en test).
  }
  out.push('commit;', '');
  return out.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(root, 'supabase/seed.sql'), buildSeedSql());
  console.log('supabase/seed.sql généré');
}
