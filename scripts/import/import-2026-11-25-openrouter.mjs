// Import du 2026-11-25 : OpenRouter, ajouté sous collected-apis.json#apis-publiques après vérification
// individuelle (docs officielles, API REST + SDK, modèles gratuits disponibles + facturation à l'usage).
// Idempotent : relancer ne crée aucun doublon.
// Usage : node scripts/import/import-2026-11-25-openrouter.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const seedPath = join(root, 'data/seed/resources.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const CHECKED = '2026-11-25';

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

add({
  slug: 'openrouter',
  url: 'https://openrouter.ai/docs',
  type: 'tool',
  discipline: 'informatique',
  original_language: 'en',
  level: 'unknown',
  access_cost: 'freemium',
  author: null,
  publisher: 'OpenRouter',
  license: null,
  formats: ['web'],
  topics: ['apis-publiques', 'intelligence-artificielle', 'developpement-web'],
  link_status: 'ok',
  link_checked_at: CHECKED,
  translations: {
    fr: {
      title: 'OpenRouter',
      description: "Passerelle unique vers des dizaines de modèles d'IA (OpenAI, Anthropic, Google, Meta, Mistral...) via une seule API REST, avec bascule automatique entre fournisseurs. Plusieurs modèles gratuits disponibles ; au-delà, facturation à l'usage selon le modèle choisi. SDK et documentation soignés, service bien établi et largement utilisé par les développeurs.",
    },
    en: {
      title: 'OpenRouter',
      description: 'A single gateway to dozens of AI models (OpenAI, Anthropic, Google, Meta, Mistral...) through one REST API, with automatic fallback between providers. Several free models available; beyond that, usage-based billing depending on the chosen model. Well-documented SDK, an established service widely used by developers.',
    },
  },
});

seed._status = 'Ressources réelles et publiques. link_status = ok uniquement si vérifié dans un navigateur (date dans link_checked_at). Licence = null quand elle n’a pas été confirmée : ne pas compléter par supposition (RM-04).';
writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
console.log(`Ajoutées : ${added.length} · ignorées (doublons) : ${skipped.length} · total catalogue : ${seed.resources.length}`);
if (skipped.length) console.log('Doublons ignorés :', skipped.join(', '));
