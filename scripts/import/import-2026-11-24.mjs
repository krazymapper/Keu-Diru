// Import du 2026-11-24 : listes du porteur (LinkConcierge, carrières, tutoriels GEE, bassins versants, start.me AI, Bellingcat OSINT,
// feuille de route Data Analyst). Idempotent : relancer ne crée aucun doublon.
// Usage : node scripts/import/import-2026-11-24.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const seedPath = join(root, 'data/seed/resources.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const sites = JSON.parse(readFileSync(join(here, 'collected-sites.json'), 'utf8'));
// Lot du 2026-11-24 (soir) : start.me « AI »
const ai = JSON.parse(readFileSync(join(here, 'collected-ai.json'), 'utf8'));
sites.resources.push(...ai.resources);
// Lot du 2026-11-24 (nuit) : boîte à outils OSINT de Bellingcat (8 CSV)
const osintRaw = JSON.parse(readFileSync(join(here, 'collected-osint.json'), 'utf8'));
const osint = osintRaw.rows.map(([slug, url, type, discipline, lang, cost, publisher, topics, title, fr, en, status]) => ({
  slug, url, type, discipline, lang, cost, publisher, topics, fr: [title, fr], en: [title, en],
  status: status === 'unverified' ? undefined : status, unverified: status === 'unverified',
}));
sites.resources.push(...osint);
const gee = JSON.parse(readFileSync(join(here, 'collected-gee.json'), 'utf8'));
const catchment = JSON.parse(readFileSync(join(here, 'collected-catchment.json'), 'utf8'));
const CHECKED = '2026-11-24';

// Miroir JS de src/lib/url.ts (évite une dépendance TS dans un script node)
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
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+[^-]*$/, (x) => (x.length > 20 ? '' : x)).replace(/-+$/, '');

const existingUrls = new Set(seed.resources.filter((r) => r.url).map((r) => normalizeUrl(r.url)));
const existingSlugs = new Set(seed.resources.map((r) => r.slug));
const added = [];
const groups = { gee: [], catchment: [] };
const skipped = [];

function add(r, group) {
  for (const [l, t] of Object.entries(r.translations))
    if (t.description.trim().length < 20 || t.title.trim().length < 3) throw new Error(`Titre ou description trop court (${l}) : ${r.slug}`);
  const n = normalizeUrl(r.url);
  if (existingUrls.has(n)) {
    skipped.push(`${r.slug} (URL déjà présente)`);
    const prev = seed.resources.find((x) => x.url && normalizeUrl(x.url) === n);
    if (group && prev) groups[group].push(prev.slug);
    return;
  }
  let slug = r.slug;
  for (let i = 2; existingSlugs.has(slug); i++) slug = `${r.slug}-${i}`;
  existingUrls.add(n); existingSlugs.add(slug);
  seed.resources.push({ ...r, slug });
  added.push(slug);
  if (group) groups[group].push(slug);
}

// --- Sites et ressources web
for (const s of sites.resources) {
  add({
    slug: s.slug, url: s.url, type: s.type, discipline: s.discipline, original_language: s.lang,
    level: 'unknown', access_cost: s.cost, author: null, publisher: s.publisher, license: null,
    formats: ['web'], topics: s.topics,
    link_status: s.unverified ? 'unverified' : (s.status ?? 'ok'), link_checked_at: s.unverified ? null : CHECKED,
    translations: {
      fr: { title: s.fr[0], description: s.fr[1] }, en: { title: s.en[0], description: s.en[1] },
      ...(s.de ? { de: { title: s.de[0], description: s.de[1] } } : {}),
    },
  });
}

// --- Vidéos Google Earth Engine (Amirhossein Ahrari)
const geeTopic = { secheresse: ['google-earth-engine', 'secheresse'], climat: ['google-earth-engine', 'climat'], hydrologie: ['google-earth-engine', 'hydrologie'] };
const geeTheme = { secheresse: ['sécheresse', 'drought'], climat: ['climat', 'climate'], hydrologie: ['hydrologie', 'hydrology'] };
for (const [id, title, theme] of gee.videos) {
  const n = title.match(/Tutorial-(\d+)/)?.[1];
  const short = title.replace(/^Google Earth Engine Tutorial-\d+( Published)?:\s*/, '');
  add({
    slug: `gee-${n}-${slugify(short)}`.slice(0, 90).replace(/-+$/, ''), url: `https://www.youtube.com/watch?v=${id}`,
    type: 'video', discipline: 'geomatique', original_language: 'en', level: 'unknown', access_cost: 'free',
    author: gee.channel, publisher: 'YouTube', license: null, formats: ['video'], topics: geeTopic[theme],
    link_status: 'ok', link_checked_at: CHECKED,
    translations: {
      fr: { title, description: `Tutoriel vidéo en anglais (thème : ${geeTheme[theme][0]}) de la série Google Earth Engine publiée par la chaîne YouTube « ${gee.channel} ».` },
      en: { title, description: `Video tutorial (topic: ${geeTheme[theme][1]}) from the Google Earth Engine series published by the YouTube channel “${gee.channel}”.` },
    },
  }, 'gee');
}

// --- Vidéos bassins versants (Hans van der Kwast)
for (const [id, title] of catchment.videos) {
  add({
    slug: `qgis-${slugify(title)}`.slice(0, 90).replace(/-+$/, ''), url: `https://www.youtube.com/watch?v=${id}`,
    type: 'video', discipline: 'geomatique', original_language: 'en', level: 'unknown', access_cost: 'free',
    author: catchment.channel, publisher: 'YouTube', license: null, formats: ['video'], topics: ['bassins-versants', 'sig-bureautique'],
    link_status: 'ok', link_checked_at: CHECKED,
    translations: {
      fr: { title, description: `Tutoriel vidéo en anglais de ${catchment.channel} sur la délimitation des réseaux hydrographiques et des bassins versants avec des outils SIG.` },
      en: { title, description: `Video tutorial by ${catchment.channel} on stream network and catchment delineation with GIS tools.` },
    },
  }, 'catchment');
}

// --- Sujets
const newTopics = [
  ['google-earth-engine', 'geomatique', 'Google Earth Engine', 'Google Earth Engine'],
  ['hydrologie', 'environnement-climat', 'Hydrologie', 'Hydrology'],
  ['secheresse', 'environnement-climat', 'Sécheresse', 'Drought'],
  ['bassins-versants', 'geomatique', 'Bassins versants', 'Catchments'],
  ['teledetection', 'geomatique', 'Télédétection', 'Remote sensing'],
  ['developpement-web', 'informatique', 'Développement web', 'Web development'],
  ['productivite', null, 'Productivité', 'Productivity'],
  ['analyse-donnees', 'donnees-statistiques', 'Analyse de données', 'Data analysis'],
  ['sql', 'informatique', 'SQL', 'SQL'],
  ['visualisation', 'donnees-statistiques', 'Visualisation de données', 'Data visualisation'],
  ['intelligence-artificielle', 'informatique', 'Intelligence artificielle', 'Artificial intelligence'],
  ['offres-emploi', 'carrieres-opportunites', "Offres d'emploi", 'Job offers'],
  ['veille-organisations', 'carrieres-opportunites', 'Organisations à suivre', 'Organisations to follow'],
  ['bourses-mobilite', 'carrieres-opportunites', 'Bourses & mobilité', 'Scholarships & mobility'],
  ['associations-professionnelles', 'carrieres-opportunites', 'Associations professionnelles', 'Professional associations'],
  ['leadership-jeunes', 'carrieres-opportunites', 'Programmes jeunes leaders', 'Young leaders programmes'],
  ['consultance', 'carrieres-opportunites', 'Appels à consultants', 'Calls for consultants'],
  ['fondations', 'carrieres-opportunites', 'Fondations', 'Foundations'],
  ['evenements', 'carrieres-opportunites', 'Conférences & événements', 'Conferences & events'],
  ['reseaux-alumni', 'carrieres-opportunites', "Réseaux d'anciens", 'Alumni networks'],
  ['ia-image-video', 'informatique', 'IA : images & vidéo', 'AI: images & video'],
  ['creation-video', 'informatique', 'Création vidéo', 'Video creation'],
  ['ia-audio-voix', 'informatique', 'IA : audio & voix', 'AI: audio & voice'],
  ['assistants-ia', 'informatique', 'Assistants IA', 'AI assistants'],
  ['veille-ia', 'informatique', 'Veille IA', 'AI news & directories'],
  ['3d-animation', 'informatique', '3D & animation', '3D & animation'],
  ['enquete-sources-ouvertes', null, 'Enquête en sources ouvertes (OSINT)', 'Open-source investigation (OSINT)'],
  ['verification-information', null, "Vérification de l'information", 'Fact-checking & verification'],
  ['cartes-en-ligne', 'geomatique', 'Cartes en ligne & vues de rue', 'Online maps & street view'],
  ['cartes-anciennes', 'geomatique', 'Cartes anciennes', 'Historical maps'],
  ['geolocalisation', 'geomatique', 'Géolocalisation d\'images', 'Image geolocation'],
  ['projections-coordonnees', 'geomatique', 'Projections & coordonnées', 'Projections & coordinates'],
  ['suivi-transports', null, 'Suivi des transports (air, mer, rail)', 'Transport tracking (air, sea, rail)'],
  ['analyse-sites-web', 'informatique', 'Analyse de sites web & domaines', 'Website & domain analysis'],
  ['reseaux-sociaux-telegram', 'informatique', 'Telegram (contenus publics)', 'Telegram (public content)'],
];
for (const [slug, discipline, fr, en] of newTopics)
  if (!seed.topics.some((t) => t.slug === slug)) seed.topics.push({ slug, discipline, labels: { fr, en } });

// --- Collections
const collections = [
  { slug: 'google-earth-engine-hydrologie-climat', title: { fr: 'Google Earth Engine : hydrologie, sécheresse et climat', en: 'Google Earth Engine: hydrology, drought and climate' },
    description: { fr: 'Série de tutoriels vidéo gratuits d’Amirhossein Ahrari, réunis à partir des listes du porteur.', en: 'Series of free video tutorials by Amirhossein Ahrari, gathered from the maintainer’s lists.' }, items: groups.gee },
  { slug: 'delimitation-bassins-versants-qgis', title: { fr: 'Délimiter des bassins versants avec QGIS', en: 'Catchment delineation with QGIS' },
    description: { fr: '25 tutoriels vidéo gratuits de Hans van der Kwast, de la théorie aux flux automatisés.', en: '25 free video tutorials by Hans van der Kwast, from theory to automated workflows.' }, items: groups.catchment },
  { slug: 'opportunites-internationales', title: { fr: 'Opportunités internationales', en: 'International opportunities' },
    description: { fr: 'Carrières, bourses, programmes jeunes leaders, appels à consultants, fondations et réseaux d’anciens.', en: 'Careers, scholarships, young leaders programmes, consultancy calls, foundations and alumni networks.' },
    items: seed.resources.filter((r) => r.discipline === 'carrieres-opportunites').map((r) => r.slug) },
  { slug: 'formations-nasa-arset', title: { fr: 'Formations NASA ARSET en télédétection', en: 'NASA ARSET remote sensing trainings' },
    description: { fr: 'Formations gratuites de la NASA (Earthdata) : sécheresse, qualité de l’air, eaux de surface, biomasse, inondations, radar.', en: 'Free NASA (Earthdata) trainings: drought, air quality, surface water, biomass, floods, radar.' },
    items: seed.resources.filter((r) => r.slug.startsWith('arset-')).map((r) => r.slug) },
  { slug: 'outils-ia-generative', title: { fr: 'Outils d’IA générative', en: 'Generative AI tools' },
    description: { fr: 'Assistants, génération d’images, de vidéos, de voix et de musique, annuaires et chaînes de veille. Outils commerciaux évoluant vite : vérifiez conditions et coûts.', en: 'Assistants, image, video, voice and music generation, directories and news channels. Fast-moving commercial tools: check terms and costs.' },
    items: ai.resources.map((r) => r.slug) },
  { slug: 'boite-outils-osint-bellingcat', title: { fr: 'Boîte à outils OSINT (Bellingcat)', en: 'OSINT toolkit (Bellingcat)' },
    description: { fr: 'Cartes, imagerie satellite, géolocalisation d’images, suivi des transports, vérification d’images et analyse de sites web, issus de la boîte à outils de Bellingcat. Outils de ciblage de personnes exclus.', en: 'Maps, satellite imagery, image geolocation, transport tracking, image verification and website analysis, from Bellingcat’s toolkit. People-targeting tools excluded.' },
    items: osint.map((r) => seed.resources.find((x) => x.url && normalizeUrl(x.url) === normalizeUrl(r.url))?.slug).filter(Boolean) },
  { slug: 'sources-donnees-sig', title: { fr: 'Sources de données SIG', en: 'GIS data sources' },
    description: { fr: 'Portails pour télécharger limites administratives, OpenStreetMap, géologie, zones humides et données de développement.', en: 'Portals to download administrative boundaries, OpenStreetMap, geology, wetlands and development data.' },
    items: ['geofabrik-shapefiles', 'diva-gis-data', 'gadm', 'overpass-turbo', 'humanitarian-data-exchange', 'natural-earth', 'mapcruzin', 'usgs-world-geologic-maps', 'ramsar-sites-information-service', 'world-bank-data-catalog'] },
];
for (const c of collections) {
  c.items = c.items.filter((s) => seed.resources.some((r) => r.slug === s));
  const i = seed.collections.findIndex((x) => x.slug === c.slug);
  if (i >= 0) seed.collections[i] = c; else seed.collections.push(c);
}

// --- Parcours « Devenir Data Analyst » (contenu de la feuille de route fournie par le porteur)
const path = {
  slug: 'devenir-data-analyst', level: 'beginner',
  title: { fr: 'Devenir Data Analyst', en: 'Becoming a Data Analyst' },
  objective: { fr: 'Passer des bases statistiques à un projet d’analyse complet, de la donnée brute au tableau de bord.', en: 'Go from statistical basics to a complete analysis project, from raw data to dashboard.' },
  steps: [
    { resource: 'khan-academy-statistiques-probabilites', instruction: { fr: 'Étape 0 — Apprendre la statistique de base et comprendre les données avant de les analyser. Ne saute pas cette étape.', en: 'Step 0 — Learn basic statistics and understand data before analysing it. Do not skip this step.' } },
    { resource: 'microsoft-excel-aide-formation', instruction: { fr: 'Étape 1 — Excel avancé : la référence et le premier outil de tout analyste.', en: 'Step 1 — Advanced Excel: the reference and every analyst’s first tool.' } },
    { resource: 'sqlbolt', instruction: { fr: 'Étape 2 — SQL : interroger, filtrer et croiser des bases de données.', en: 'Step 2 — SQL: query, filter and join databases.' } },
    { resource: 'kaggle-learn', instruction: { fr: 'Étape 3 — Python et Pandas : automatiser et passer à l’échelle.', en: 'Step 3 — Python and Pandas: automate and scale.' } },
    { resource: 'microsoft-learn-power-bi', instruction: { fr: 'Étape 4a — Power BI : transformer des chiffres en tableaux de bord clairs pour les décideurs.', en: 'Step 4a — Power BI: turn figures into clear dashboards for decision-makers.' } },
    { resource: 'tableau-public-how-to-videos', instruction: { fr: 'Étape 4b — Tableau Public : alternative gratuite pour la visualisation.', en: 'Step 4b — Tableau Public: a free alternative for visualisation.' } },
    { resource: 'learn-prompting', instruction: { fr: 'Étape 5 — Accélérer avec l’IA : écrire du code, déboguer, comprendre un jeu de données. L’IA ne remplace pas l’analyste.', en: 'Step 5 — Speed up with AI: write code, debug, understand a dataset. AI does not replace the analyst.' } },
    { resource: 'kaggle-datasets', instruction: { fr: 'Étape finale — Un projet concret de A à Z : choisir un sujet, trouver des données, les nettoyer, les analyser, construire un tableau de bord et raconter une histoire.', en: 'Final step — A complete project: pick a topic, find data, clean it, analyse it, build a dashboard and tell a story.' } },
  ],
};
const pi = seed.learning_paths.findIndex((p) => p.slug === path.slug);
if (pi >= 0) seed.learning_paths[pi] = path; else seed.learning_paths.push(path);

seed._status = 'Ressources réelles et publiques. link_status = ok uniquement si vérifié dans un navigateur (date dans link_checked_at). Licence = null quand elle n’a pas été confirmée : ne pas compléter par supposition (RM-04).';
writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
console.log(`Ajoutées : ${added.length} · ignorées (doublons) : ${skipped.length} · total catalogue : ${seed.resources.length}`);
if (skipped.length) console.log('Doublons ignorés :', skipped.join(', '));
