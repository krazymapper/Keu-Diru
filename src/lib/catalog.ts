/**
 * Chargement du catalogue AU BUILD.
 * - Supabase configuré (PUBLIC_SUPABASE_URL + clé publique) → données publiées réelles.
 * - Sinon → data/seed/*.json (mode démonstration).
 * - Supabase injoignable (ex. projet gratuit mis en pause) → repli sur le seed avec
 *   avertissement, sauf KEU_STRICT_DATA=1 qui fait échouer le build (évite de
 *   publier silencieusement des données périmées).
 */
import taxonomy from '../../data/seed/taxonomy.json';
import seed from '../../data/seed/resources.json';
import { catalogSchema, type Catalog, type Resource } from './schema';

let cache: Promise<Catalog> | null = null;

export function getCatalog(): Promise<Catalog> {
  cache ??= load();
  return cache;
}

function fromSeed(): Catalog {
  return catalogSchema.parse({
    languages: taxonomy.languages,
    disciplines: taxonomy.disciplines,
    resource_types: taxonomy.resource_types,
    topics: seed.topics,
    resources: seed.resources,
    collections: seed.collections,
    learning_paths: seed.learning_paths,
  });
}

async function load(): Promise<Catalog> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return fromSeed();
  try {
    return await fromSupabase(url, key);
  } catch (err) {
    if (import.meta.env.KEU_STRICT_DATA === '1') throw err;
    console.warn('[catalog] Supabase indisponible, repli sur le seed :', err);
    return fromSeed();
  }
}

async function fromSupabase(url: string, key: string): Promise<Catalog> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const ok = <T>(r: { data: T | null; error: unknown }) => {
    if (r.error) throw r.error;
    return r.data as T;
  };
  const [languages, disciplines, types, topics, resources, collections, paths] = await Promise.all([
    sb.from('languages').select('code, native_name, is_ui_language').then(ok),
    sb.from('disciplines').select('id, slug, icon, labels').order('sort_order').then(ok),
    sb.from('resource_types').select('id, slug, labels').then(ok),
    sb.from('topics').select('slug, labels, disciplines(slug)').then(ok),
    // RLS : la clé publique ne renvoie que status = 'published'
    sb.from('resources')
      .select('slug, url, original_language, level, access_cost, author, publisher, license, formats, link_status, resource_types(slug), disciplines(slug), resource_translations(language, title, description), resource_topics(topics(slug))')
      .eq('status', 'published').order('published_at', { ascending: false }).limit(5000).then(ok),
    sb.from('collections').select('slug, title, description, collection_items(position, resources(slug))').eq('status', 'published').then(ok),
    sb.from('learning_paths').select('slug, level, title, objective, learning_path_steps(position, instruction, resources(slug))').eq('status', 'published').then(ok),
  ]) as any[];

  return catalogSchema.parse({
    languages,
    disciplines,
    resource_types: types,
    topics: topics.map((t: any) => ({ slug: t.slug, labels: t.labels, discipline: t.disciplines?.slug ?? null })),
    resources: resources.map((r: any) => ({
      ...r,
      type: r.resource_types.slug,
      discipline: r.disciplines.slug,
      topics: r.resource_topics.map((x: any) => x.topics.slug),
      translations: Object.fromEntries(r.resource_translations.map((t: any) => [t.language, { title: t.title, description: t.description }])),
    })),
    collections: collections.map((c: any) => ({
      slug: c.slug, title: c.title, description: c.description,
      items: [...c.collection_items].sort((a: any, b: any) => (a.position ?? 1e9) - (b.position ?? 1e9)).map((i: any) => i.resources.slug),
    })),
    learning_paths: paths.map((p: any) => ({
      slug: p.slug, level: p.level, title: p.title, objective: p.objective,
      steps: [...p.learning_path_steps].sort((a: any, b: any) => a.position - b.position)
        .map((s: any) => ({ resource: s.resources?.slug ?? null, instruction: s.instruction })),
    })),
  });
}

/** Traduction affichée : langue d'interface > langue originale > première disponible (RM-09). */
export function pickTranslation(r: Resource, lang: string) {
  const t = r.translations;
  const code = t[lang] ? lang : r.original_language && t[r.original_language] ? r.original_language : Object.keys(t)[0];
  return { ...t[code], language: code, isFallback: code !== lang };
}

export function label(labels: Record<string, string> | undefined | null, lang: string): string {
  if (!labels) return '';
  return labels[lang] ?? labels.fr ?? labels.en ?? Object.values(labels)[0] ?? '';
}
