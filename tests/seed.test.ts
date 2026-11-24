// Contrôle qualité des données de démarrage (RM-03, RM-04, RM-06, RM-10)
import { describe, it, expect } from 'vitest';
import taxonomy from '../data/seed/taxonomy.json';
import seed from '../data/seed/resources.json';
import { catalogSchema } from '../src/lib/schema';
import { normalizeUrl } from '../src/lib/url';

const catalog = catalogSchema.parse({ ...taxonomy, ...seed, resource_types: taxonomy.resource_types });
const slugs = new Set(catalog.resources.map((r) => r.slug));

describe('seed', () => {
  it('respecte le schéma', () => expect(catalog.resources.length).toBeGreaterThan(0));
  it('aucun doublon de slug ni d’URL normalisée', () => {
    expect(slugs.size).toBe(catalog.resources.length);
    const urls = catalog.resources.filter((r) => r.url).map((r) => normalizeUrl(r.url!));
    expect(new Set(urls).size).toBe(urls.length);
  });
  it('références taxonomiques valides', () => {
    const d = new Set(catalog.disciplines.map((x) => x.slug));
    const t = new Set(catalog.resource_types.map((x) => x.slug));
    const tp = new Set(catalog.topics.map((x) => x.slug));
    const l = new Set(catalog.languages.map((x) => x.code));
    for (const r of catalog.resources) {
      expect(d.has(r.discipline), r.slug).toBe(true);
      expect(t.has(r.type), r.slug).toBe(true);
      r.topics.forEach((x) => expect(tp.has(x), `${r.slug}/${x}`).toBe(true));
      if (r.original_language) expect(l.has(r.original_language), r.slug).toBe(true);
    }
  });
  it('chaque ressource a au moins FR ou EN et la traduction originale si la langue est connue', () => {
    for (const r of catalog.resources) {
      expect('fr' in r.translations || 'en' in r.translations, r.slug).toBe(true);
      if (r.original_language) expect(r.original_language in r.translations, r.slug).toBe(true);
    }
  });
  it('collections et parcours ne pointent que vers des ressources existantes', () => {
    for (const c of catalog.collections) c.items.forEach((s) => expect(slugs.has(s), `${c.slug}/${s}`).toBe(true));
    for (const p of catalog.learning_paths) p.steps.forEach((s) => s.resource && expect(slugs.has(s.resource), `${p.slug}/${s.resource}`).toBe(true));
  });
  it('aucun lien déclaré vérifié sans date de contrôle (RM-08)', () => {
    for (const r of catalog.resources) if (r.link_status !== 'unverified') expect(r.link_checked_at, r.slug).toBeTruthy();
  });
  it('aucun raccourci d’URL (lnkd.in, bit.ly…) : on stocke l’adresse finale', () => {
    for (const r of catalog.resources) expect(r.url ?? '', r.slug).not.toMatch(/\/\/(lnkd\.in|bit\.ly|t\.co|tinyurl\.com|goo\.gl)\//);
  });
});
