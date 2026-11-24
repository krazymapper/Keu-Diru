// Import du 2026-11-24 (second lot) : APIs gratuites/freemium vérifiées depuis la liste fournie par le porteur
// (code-garage.com/blog + github.com/public-apis/public-apis). Idempotent : relancer ne crée aucun doublon.
// Volontairement exclus (voir scripts/import/collected-apis.json#_source) : restcountries.eu (domaine mort,
// redirige vers un produit commercial), countryflags.io (domaine mort), Skyscanner API bonus (portail
// partenaire B2B, pas une API ouverte), OpenSky-Network (doublon du catalogue existant).
// Les 4 cours gratuits de code-garage.com/courses ne sont PAS importés ici : proposition en attente de
// validation du porteur (plateforme payante majoritairement, réputation non vérifiée indépendamment).
// Usage : node scripts/import/import-2026-11-24-apis.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const seedPath = join(root, 'data/seed/resources.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const apis = JSON.parse(readFileSync(join(here, 'collected-apis.json'), 'utf8'));
const CHECKED = '2026-11-24';

// Miroir JS de src/lib/url.ts
const TRACKING = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|si|feature)(=|$)/i;
function normalizeUrl(raw) {
  let u = raw.trim().split('#')[0];
  const m = u.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]+/);
  if (!m) return u.toLowerCase();
  let host = m[0].toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:(80|443)$/, '');
  let rest = u.slice(m[0].length);
  const qi = rest.indexOf('?');
  const query = qi >= 0 ? rest.slice(qi + 1) : '';
  if (qi >= 0) rest = rest.slice(0, qi);
  const kept = query.split('&').filter((p) => p && !TRACKING.test(p)).sort();
  return host + rest.replace(/\/+$/, '') + (kept.length ? '?' + kept.join('&') : '');
}

const existingUrls = new Set(seed.resources.filter((r) => r.url).map((r) => normalizeUrl(r.url)));
const existingSlugs = new Set(seed.resources.map((r) => r.slug));
const added = [];
const skipped = [];

function add(r) {
  for (const [l, t] of Object.entries(r.translations))
    if (t.description.trim().length < 20 || t.title.trim().length < 3) throw new Error(`Titre ou description trop court (${l}) : ${r.slug}`);
  const n = normalizeUrl(r.url);
  if (existingUrls.has(n)) { skipped.push(`${r.slug} (URL déjà présente)`); return; }
  let slug = r.slug;
  for (let i = 2; existingSlugs.has(slug); i++) slug = `${r.slug}-${i}`;
  existingUrls.add(n); existingSlugs.add(slug);
  seed.resources.push({ ...r, slug });
  added.push(slug);
}

for (const a of apis.resources) {
  add({
    slug: a.slug, url: a.url, type: a.type, discipline: a.discipline, original_language: a.lang,
    level: 'unknown', access_cost: a.cost, author: null, publisher: a.publisher, license: null,
    formats: ['web'], topics: a.topics,
    link_status: 'ok', link_checked_at: CHECKED,
    translations: {
      fr: { title: a.fr[0], description: a.fr[1] },
      en: { title: a.en[0], description: a.en[1] },
    },
  });
}

// --- Nouveau sujet
const newTopics = [
  ['apis-publiques', 'informatique', 'APIs publiques', 'Public APIs'],
];
for (const [slug, discipline, fr, en] of newTopics)
  if (!seed.topics.some((t) => t.slug === slug)) seed.topics.push({ slug, discipline, labels: { fr, en } });

// --- Collection
const collection = {
  slug: 'apis-gratuites-developpeurs',
  title: { fr: 'APIs gratuites pour développeurs', en: 'Free APIs for developers' },
  description: {
    fr: 'Sélection d’APIs publiques gratuites ou freemium pour s’entraîner et prototyper (données ouvertes, météo, films, plantes, utilisateurs factices, GIFs…), plus le répertoire public-apis comme point d’entrée vers des centaines d’autres. Vérifiez toujours les quotas et conditions avant un usage en production.',
    en: 'Selection of free or freemium public APIs for practice and prototyping (open data, weather, movies, plants, fake users, GIFs…), plus the public-apis directory as an entry point to hundreds more. Always check quotas and terms before production use.',
  },
  items: added,
};
const ci = seed.collections.findIndex((x) => x.slug === collection.slug);
if (ci >= 0) seed.collections[ci] = collection; else seed.collections.push(collection);

seed._status = 'Ressources réelles et publiques. link_status = ok uniquement si vérifié dans un navigateur (date dans link_checked_at). Licence = null quand elle n’a pas été confirmée : ne pas compléter par supposition (RM-04).';
writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
console.log(`Ajoutées : ${added.length} · ignorées (doublons) : ${skipped.length} · total catalogue : ${seed.resources.length}`);
if (skipped.length) console.log('Doublons ignorés :', skipped.join(', '));
