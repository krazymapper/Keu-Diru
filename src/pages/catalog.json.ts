import type { APIRoute } from 'astro';
import { getCatalog } from '../lib/catalog';

/** Index public du catalogue, mis en cache par le service worker (recherche hors ligne). */
export const GET: APIRoute = async () => {
  const c = await getCatalog();
  const body = {
    generated_at: new Date().toISOString(),
    disciplines: c.disciplines.map(({ slug, labels }) => ({ slug, labels })),
    types: c.resource_types,
    languages: c.languages.map(({ code, native_name }) => ({ code, native_name })),
    topics: c.topics.map(({ slug, labels }) => ({ slug, labels })),
    resources: c.resources.map((r) => ({
      slug: r.slug, type: r.type, discipline: r.discipline, lang: r.original_language,
      level: r.level, cost: r.access_cost, publisher: r.publisher, topics: r.topics,
      link: r.link_status, url: r.url, t: r.translations,
    })),
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
