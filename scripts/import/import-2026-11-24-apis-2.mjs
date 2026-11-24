// Import du 2026-11-24 (3e lot) : répertoire free-apis.github.io, ajouté sous une étiquette dédiée
// « APIs commerciales / non vérifiées » à la demande du porteur, pour le distinguer clairement des
// APIs individuellement vérifiées (collected-apis.json). Dérivé de public-apis/public-apis (déjà au
// catalogue sous le slug public-apis-github) mais mélange des entrées commerciales récentes
// (passerelles de revente de modèles IA à crédits prépayés) non vérifiées une par une.
// Idempotent : relancer ne crée aucun doublon.
// Usage : node scripts/import/import-2026-11-24-apis-2.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const seedPath = join(root, 'data/seed/resources.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const CHECKED = '2026-11-24';

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

// --- Nouveau sujet : étiquette de prudence
const newTopics = [
  ['apis-commerciales-non-verifiees', 'informatique', 'APIs commerciales / non vérifiées', 'Commercial / unverified APIs'],
];
for (const [slug, discipline, fr, en] of newTopics)
  if (!seed.topics.some((t) => t.slug === slug)) seed.topics.push({ slug, discipline, labels: { fr, en } });

add({
  slug: 'free-apis-github-io',
  url: 'https://free-apis.github.io/',
  type: 'repository',
  discipline: 'informatique',
  original_language: 'en',
  level: 'unknown',
  access_cost: 'unknown',
  author: null,
  publisher: 'Free-APIs',
  license: null,
  formats: ['web'],
  topics: ['apis-publiques', 'apis-commerciales-non-verifiees'],
  link_status: 'ok',
  link_checked_at: CHECKED,
  translations: {
    fr: {
      title: 'Free APIs (free-apis.github.io)',
      description: "Interface de navigation (2000+ entrées) dérivée du répertoire public-apis, mais alimentée aussi par des soumissions récentes non filtrées par la même rigueur communautaire — notamment de nombreuses passerelles commerciales de revente de modèles d'IA à crédits prépayés. Chaque API doit être vérifiée individuellement (coût réel, fiabilité, pérennité) avant usage : ni gratuite ni de qualité garanties malgré le nom du site.",
    },
    en: {
      title: 'Free APIs (free-apis.github.io)',
      description: 'Browsing interface (2000+ entries) derived from the public-apis directory, but also fed by recent submissions without the same community vetting — notably many commercial prepaid-credit AI model resale gateways. Each API needs individual verification (real cost, reliability, longevity) before use: neither free nor quality is guaranteed despite the site name.',
    },
  },
});

seed._status = 'Ressources réelles et publiques. link_status = ok uniquement si vérifié dans un navigateur (date dans link_checked_at). Licence = null quand elle n’a pas été confirmée : ne pas compléter par supposition (RM-04).';
writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
console.log(`Ajoutées : ${added.length} · ignorées (doublons) : ${skipped.length} · total catalogue : ${seed.resources.length}`);
if (skipped.length) console.log('Doublons ignorés :', skipped.join(', '));
