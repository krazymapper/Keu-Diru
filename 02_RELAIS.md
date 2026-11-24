# KEU DIRU — Document de relais et de reprise du projet

**Type de document :** Passation / mémoire opérationnelle
**Version :** 1.1 — mise à jour du 2026-11-24 (voir §19)
**Statut :** Relais actif — actualiser à chaque étape significative
**Public :** Porteur du projet, nouvelle IA, développeur, designer, contributeur ou partenaire

---

## 1. Pourquoi ce document existe

Ce document permet à une personne ou à une intelligence artificielle qui n'a pas suivi les échanges précédents de reprendre KEU DIRU sans perdre :
- l'origine et l'objectif du projet ;
- les décisions déjà validées ;
- les choix techniques envisagés ;
- la distinction entre ce qui est décidé, proposé et réellement réalisé ;
- les éléments qui restent à faire ;
- les prochaines actions concrètes.

Il doit être lu avec `01_CONSOLIDATION_ORIGINE_REGLES_METIER.md` (référentiel métier) et `03_AUDIT_TECHNIQUE.md` (audit, corrections, registre des bugs anticipés, décisions attendues).

## 2. Résumé exécutif

**KEU DIRU** est une plateforme publique, communautaire, multidisciplinaire et multilingue de découverte et d'organisation des connaissances.

Elle doit permettre de recenser et retrouver des cours, tutoriels, matériels pédagogiques, sources de données, datasets, sites, outils, articles, vidéos, livres et autres ressources.

Le produit combine :
- une bibliothèque éditoriale pour explorer le catalogue ;
- un tableau de bord pour les fonctions personnelles et communautaires.

Le MVP doit inclure la recherche, les filtres, les collections, les favoris, la contribution avec modération, les parcours d'apprentissage et une PWA. Le français et l'anglais sont les langues initiales.

**État au 2026-11-24 :** la v0.1 est en ligne sur https://krazymapper.github.io/Keu-Diru/ (dépôt `krazymapper/Keu-Diru`, branche `main`, CI verte). Aucun projet Supabase n'est créé ni connecté. Un aperçu privé de la v0.1 est publié sur claude.ai pour revue. Détails au §19.

## 3. État du projet

### 3.1 Décisions confirmées

| Sujet | Décision |
|---|---|
| Nom | KEU DIRU |
| Nature | Base de connaissances multidisciplinaire |
| Vocation | Communautaire |
| Accès au catalogue | Public |
| Langues du MVP | Français et anglais |
| Direction UI | Hybride : bibliothèque éditoriale + dashboard |
| Recherche | Fonctionnalité MVP |
| Filtres | Fonctionnalité MVP |
| Collections | Fonctionnalité MVP |
| Favoris | Fonctionnalité MVP |
| Contribution | Fonctionnalité MVP |
| Parcours d'apprentissage | Fonctionnalité MVP |
| PWA | Fonctionnalité MVP |

### 3.2 Architecture : recommandée → implémentée en v0.1 (non déployée)

| Couche | Choix | État v0.1 |
|---|---|---|
| Frontend | Astro 7 + TypeScript, sortie statique, routes `/fr` et `/en` | Implémenté, testé |
| Interactivité | React 19 (5 îlots) | Implémenté, testé E2E |
| Styles | Tailwind CSS 4, polices système | Implémenté |
| Validation | Zod 4 | Implémenté, testé |
| Base de données | Supabase PostgreSQL — 3 migrations + RLS | Écrit, testé dans PGlite, **non déployé** |
| Authentification | Supabase Auth | **Non implémenté** (schéma prêt) |
| Recherche | Client sur `catalog.json` ; SQL FTS + `pg_trgm` prête | Implémenté, testé |
| CI/CD | GitHub Actions (CI, Pages, liens) | Écrit, **jamais exécuté** (dépôt vide) |
| Hébergement | GitHub Pages sous `/Keu-Diru/` (sensible à la casse) | Configuré, **non activé** |
| PWA | Manifest + service worker prudent | Implémenté (non testable dans l'aperçu claude.ai) |

### 3.3 Éléments encore incomplets

- Écrans de connexion, soumission réelle des contributions, file de modération (spécifiés en wireframes, non codés).
- Synchronisation favoris/progression locale → compte.
- Tests sur un projet Supabase réel (Auth, JWT, PostgREST).
- Audit d'accessibilité outillé ; politique de confidentialité.

## 4. Informations à ne pas supposer

Le repreneur ne doit pas supposer que :
- un projet Supabase est créé ;
- des clés API ou variables d'environnement existent ;
- les migrations SQL ont été déployées ;
- les rôles et règles RLS sont opérationnels en production (ils sont seulement testés localement) ;
- les chiffres cibles du MVP sont atteints (17 ressources de démonstration sur 100 visées) ;
- la taxonomie proposée est validée ;
- les licences MIT et CC BY 4.0 ont été publiées et validées ;
- un nom de domaine ou une identité visuelle définitive a été adopté.

Si un accès, un dépôt ou un compte est nécessaire, demander au porteur du projet de fournir le lien ou d'effectuer lui-même l'autorisation requise. Ne jamais demander ni enregistrer un mot de passe ou un secret dans ce document.

## 5. Arborescence réelle de la v0.1

```text
Keu-Diru/
├── 01_CONSOLIDATION_ORIGINE_REGLES_METIER.md
├── 02_RELAIS.md
├── 03_AUDIT_TECHNIQUE.md
├── README.md · CONTRIBUTING.md · SECURITY.md   (pas de LICENSE : en attente de décision)
├── .github/
│   ├── workflows/ ci.yml · deploy.yml · link-check.yml
│   ├── ISSUE_TEMPLATE/ new-resource.yml · report-problem.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── data/seed/ taxonomy.json · resources.json        (source unique des données de démo)
├── docs/ ARCHITECTURE.md · DATA-MODEL.md · ROADMAP.md
├── public/ favicon.svg · manifest.webmanifest · sw.js · robots.txt · icons/
├── scripts/ build-seed-sql.mjs · check-links.mjs · check-internal-links.mjs · make-preview.mjs
├── src/
│   ├── components/ Explorer · ContributeForm · FavoriteButton · PathProgress · Dashboard (.tsx) · ResourceCard.astro
│   ├── i18n/ index.ts · fr.ts · en.ts
│   ├── layouts/ Base.astro
│   ├── lib/ catalog.ts · schema.ts · search.ts · storage.ts · url.ts · useHydrated.ts
│   ├── pages/ index · 404 · catalog.json · [lang]/{index, explore, about, contribute, dashboard, resources/[slug], collections/…, paths/…}
│   └── styles/ global.css
├── supabase/
│   ├── migrations/ 001_init_schema · 002_security · 003_search
│   ├── rollback/ 20261124000001_down.sql
│   ├── seed.sql (généré)
│   └── tests/ harness.mjs · rls.test.mjs
└── tests/ url-parity · i18n · seed · search (.test.ts) · e2e/smoke.py
```

## 6. Modèle de données

Voir `docs/DATA-MODEL.md` et les migrations (qui font foi). Points structurants ajoutés par l'audit :
1. Rôles dans `user_roles`, jamais dans `profiles` (anti-escalade).
2. Libellés de taxonomies, collections et parcours en `jsonb` multilingue (FR + EN obligatoires).
3. Deux cycles de statut distincts : ressource et contribution.
4. Publication uniquement via `review_contribution()` (transaction unique, séparation des tâches).
5. Journal d'audit append-only.

## 7. Flux métier à préserver

### 7.1 Consultation
Visiteur → catalogue public → recherche/filtres → fiche ressource → collection ou parcours. Sans inscription.

### 7.2 Contribution
Membre connecté → formulaire → validation → détection de doublon (signalement, jamais rejet automatique) → contribution *pending* → revue → approbation / correction / refus → publication au build suivant.

### 7.3 Favoris et progression
Privés. En v0.1 : stockés sur l'appareil (`localStorage`), en attendant Supabase Auth.

## 8. Sécurité et gouvernance

Exigences incontournables avant une mise en production :
- Activer et tester RLS sur toutes les tables exposées (fait localement : 13 tests d'accès).
- Rejouer ces tests sur le projet Supabase réel.
- Garder la clé `service_role` strictement côté serveur et hors du dépôt.
- Ne jamais mettre de secret dans le frontend, les commits, les captures d'écran ou la documentation.
- Activer confirmation d'e-mail et CAPTCHA dans Supabase Auth.
- Rédiger politique de confidentialité et mentions légales avant d'ouvrir les comptes.
- Prévoir sauvegarde, restauration et gestion des incidents avant le lancement public.

## 9. Licences envisagées

Proposition à confirmer : code MIT, documentation CC BY 4.0, ressources référencées sous la licence de leurs auteurs. En attendant : aucun fichier `LICENSE`, `package.json` en `UNLICENSED`.

## 10. Feuille de route

Voir `docs/ROADMAP.md` (état par phase au 2026-11-24).

## 11. Commandes utiles

```bash
npm ci
npm run dev                                  # http://localhost:4321/Keu-Diru/
npm test                                     # unitaires
npm run test:db                              # migrations + RLS (PGlite)
npm run build                                # astro check + build
node scripts/check-internal-links.mjs dist /Keu-Diru
node scripts/make-preview.mjs                # aperçu 100 % relatif (dist-preview/)
python3 tests/e2e/smoke.py http://127.0.0.1:4173/   # E2E sur un build servi localement
```

## 12. Configuration et déploiement : précautions

- Node ≥ 22.23 (Astro 7).
- GitHub Pages : chemin `/Keu-Diru/` **avec cette casse** ; surcharge via `BASE_PATH` / `SITE_URL`.
- Variables GitHub (pas des secrets, car publiques par nature) : `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
- `KEU_STRICT_DATA=1` en production pour qu'un Supabase injoignable fasse échouer le build plutôt que publier les données de démonstration.

## 13. Structure Git recommandée

Tant que l'équipe compte moins de trois personnes : `main` protégée + branches `feature/*` / `fix/*` + PR + CI obligatoire. `develop` à introduire seulement si le rythme le justifie.

## 14. Questions à poser au porteur

Voir `03_AUDIT_TECHNIQUE.md` §9 (liste priorisée). La première : **autoriser l'envoi de la v0.1 sur `krazymapper/Keu-Diru`**.

## 15. Consignes à toute IA ou personne qui reprend KEU DIRU

1. Lire intégralement les trois documents de référence avant toute modification structurante.
2. Répondre en français par défaut ; préparer l'anglais lorsque le produit ou le besoin le demande.
3. Adopter une posture de conseil stratégique : être précis, rigoureux, signaler les risques et critiquer les choix faibles.
4. Distinguer explicitement **validé**, **proposé**, **à confirmer**, **implémenté** et **testé**.
5. Ne jamais inventer un dépôt, une URL, un compte, un secret, un résultat de test ou un état d'avancement.
6. Ne pas déclarer une tâche terminée sans preuve vérifiable.
7. Privilégier les livrables directement utilisables : code, migrations, documentation, commandes et tests.
8. Avant une modification de base de données, expliquer l'impact et prévoir une migration réversible.
9. Avant un déploiement, vérifier les tests, les variables d'environnement, les politiques RLS et les chemins de base.
10. Mettre à jour ce document après chaque jalon important.
11. Ne jamais placer de secrets ou d'informations personnelles dans ce document.
12. Demander une clarification lorsqu'une décision structurante est absente, au lieu de choisir arbitrairement ; à défaut, la signaler comme **proposée**.

## 16. Modèle de mise à jour du relais

```markdown
### Mise à jour — AAAA-MM-JJ

**État général :**
**Réalisations vérifiées :**
**Fichiers créés ou modifiés :**
**Décisions validées :**
**Tests exécutés et résultats :**
**Blocages / risques :**
**Décisions en attente du porteur :**
**Prochaine action unique :**
```

## 17. Livrables de revue

- Aperçu privé de la v0.1 (claude.ai) : « KEU DIRU — Aperçu v0.1 ». Le service worker y est désactivé par l'hébergeur ; tout le reste fonctionne.
- Wireframes MVP (claude.ai) : « KEU DIRU — Wireframes MVP » — 5 écrans dont 2 spécifications d'écrans à construire (modération, connexion).

## 18. État au moment de la rédaction

- Cadrage fonctionnel validé ; audit réalisé (`03_AUDIT_TECHNIQUE.md`).
- v0.1 poussée sur `main`, CI verte, **déployée** sur https://krazymapper.github.io/Keu-Diru/ (mode sombre inclus).
- Supabase : schéma prêt, projet inexistant.
- Prochaine action : créer le projet Supabase (URL + clé publique).

## 19. Journal des mises à jour

### Mise à jour — 2026-11-24

**État général :**
- Dépôt `krazymapper/Keu-Diru` constaté vide (aucun commit, aucune branche).
- v0.1 construite de zéro dans l'environnement de travail de l'IA, versionnée localement (commit initial), non poussée.

**Réalisations vérifiées :**
- Audit des documents 01 et 02 : 4 insuffisances critiques, 10 majeures, 7 mineures, toutes traitées ou listées à arbitrer.
- Schéma Supabase : 20 tables, RLS partout, fonctions de modération et d'attribution des rôles, recherche FTS bilingue.
- Site statique bilingue : 56 pages (accueil, explorer, fiches, collections, parcours, contribuer, mon espace, à propos, 404) + `catalog.json`.
- 17 ressources réelles de démonstration (liens non vérifiés, licences renseignées seulement si certaines).
- Wireframes de 5 écrans.

**Tests exécutés et résultats :**
- Unitaires (Vitest) : 35/35 — parité normalisation d'URL SQL/TS, cohérence i18n, qualité du seed, recherche.
- Base de données (PGlite, vraies migrations) : 13/13 — accès non autorisés, escalade de rôle, auto-modération, doublons, favoris privés, suppression journalisée, anti-flood, langue d'affichage.
- E2E navigateur (Playwright + Chrome) : 13/13 — redirection de langue, recherche, filtres et URL partageable, fiches, favoris, progression, formulaire, mobile 360 px, 404 ; 0 erreur JavaScript.
- `astro check` : 0 erreur. Liens internes : 0 cassé (build production et aperçu).

**Bugs détectés par les tests et corrigés :** `ON CONFLICT` sur contrainte différable ; accès `anon` au schéma `extensions` ; absence de racinisation ; clics perdus et envoi natif du formulaire avant hydratation React ; lien d'évitement sous `<base>`. Registre complet : `03_AUDIT_TECHNIQUE.md` §6.

**Décisions en attente du porteur :** voir `03_AUDIT_TECHNIQUE.md` §9.

**Complément du même jour :** code poussé sur `main` (2 commits). CI GitHub : succès. Déploiement : build réussi, publication refusée (« Ensure GitHub Pages has been enabled ») — activation par API impossible depuis l'environnement de l'IA. Avertissement non bloquant : actions GitHub en version v4 basées sur Node 20 (dépréciées) — à mettre à jour.

**Complément (15 h 30) :** GitHub Pages activé par le porteur ; site en ligne sur https://krazymapper.github.io/Keu-Diru/ et vérifié dans un navigateur réel (pages 200, vraie 404, service worker actif, recherche/filtres et favoris fonctionnels). Ajout du **mode sombre** (système / clair / sombre, mémorisé, appliqué avant rendu) ; contrastes WCAG AA vérifiés par test automatique dans les deux thèmes (31 tests) ; E2E 14/14.

**Prochaine action unique :**
- Créer le projet Supabase et fournir l'URL + la clé publique (jamais la `service_role`).

### Mise à jour — 2026-11-24 (soir) : premier import de contenu

**Réalisations vérifiées :**
- 129 ressources ajoutées (catalogue : 17 → 146), issues de 6 listes du porteur : LinkConcierge, « Careers », 26 tutoriels GEE hydrologie, 25 tutoriels bassins versants, feuille de route Data Analyst, NASA ARSET.
- Chaque lien vérifié dans un navigateur réel le 2026-11-24 : raccourcis `lnkd.in` / `tinyurl` résolus vers l'adresse finale, titre et auteur (chaîne YouTube) relevés sur la page. `link_status = ok` + `link_checked_at`.
- Exclus et tracés (`scripts/import/collected-sites.json` → `excluded`) : carte des sols FAO/UNESCO (404), Atlas Corps (redirige vers un autre programme), ARSET n°5 (404), doublons (HDX, UNICEF ×2, 2 vidéos GEE).
- Corrections d'origine : 1 titre LinkConcierge erroné remplacé par le vrai titre YouTube ; USGS déplacé vers sa nouvelle page.
- Nouveautés : 13e discipline proposée « Carrières & opportunités », 20 sujets, 5 collections, parcours « Devenir Data Analyst » (8 étapes), langue `de`.
- Import reproductible et idempotent : `node scripts/import/import-2026-11-24.mjs`.
- Nouveaux contrôles qualité : aucun raccourci d'URL au catalogue ; tout lien « vérifié » a une date de contrôle ; traduction originale obligatoire si la langue est connue.

**Tests :** unitaires 67/67, base 13/13, E2E 14/14, 7 345 liens internes, 0 cassé.

**Points à valider par le porteur :** 13e discipline ; classement de YouTube/Medium en « Éducation & pédagogie » ; Stanford Careers ajouté avec statut « non vérifié » (ouverture impossible depuis le navigateur de contrôle) ; langue des vidéos déduite des titres (anglais).

### Mise à jour — 2026-11-24 (19 h) : import start.me « AI »

- Source : tableau public start.me de l'utilisateur « jlitz88 » (120 liens), transmis par le porteur. Source tierce, surtout des outils commerciaux d'IA générative.
- 81 ressources ajoutées (catalogue : 146 → 227) : génération d'images et de vidéos, création vidéo, audio et voix, 3D/Omniverse, assistants IA, annuaires, actualités et chaînes YouTube. Nouvelle collection « Outils d'IA générative ».
- Les 39 liens exclus sont tracés avec leur motif dans `scripts/import/collected-ai.json` → `excluded` : recherches YouTube, TinyURL désactivés (dont un « CapCut Pro gratuit » probablement piraté), sites inaccessibles ou en 404, service arrêté (Idomoo), plateformes de modèles communautaires non modérées pour un public scolaire (Civitai, Tensor.Art), hors-sujet, doublons.
- Nettoyage : liens de conversations privées (Claude, Gemini) ramenés à l'accueil ; paramètres de pistage et d'affiliation retirés ; 4 accès en « restreint » (Claude, Poe, Copilot : connexion requise ; Meta AI : 403).
- Coût d'accès « non renseigné » pour les services commerciaux : non vérifié, pas supposé.
- Garde-fou ajouté à l'import : titre d'au moins 3 caractères et description d'au moins 20 (les mêmes contraintes que la base).
- Tests : unitaires 67/67, base 13/13, E2E 14/14, 11 111 liens internes, 0 cassé.

### Mise à jour — 2026-11-24 (nuit) : boîte à outils OSINT de Bellingcat

- Source : 8 exports CSV de la Bellingcat Online Investigation Toolkit, transmis par le porteur (géolocalisation, recherche inversée d'images, cartes, imagerie satellite, vues de rue, Telegram, transports, sites web). 116 entrées uniques après dédoublonnage entre fichiers.
- 105 ressources ajoutées (catalogue : 227 → 332), plus la page d'accueil de la boîte à outils, ajoutée comme source. Nouvelle collection « Boîte à outils OSINT (Bellingcat) ». 9 nouveaux sujets : enquête en sources ouvertes, vérification de l'information, cartes en ligne, cartes anciennes, géolocalisation d'images, projections et coordonnées, suivi des transports, analyse de sites web, Telegram.
- Descriptions FR/EN rédigées pour KEU DIRU (texte Bellingcat non repris ; l'adresse e-mail personnelle présente dans la fiche EOS n'a pas été reprise). Coût repris de la colonne « Cost » des CSV, non revérifié.
- **Exclusions éthiques (proposé, à valider) :** outils qui servent à cibler des personnes. Ce sont : le vérificateur de numéros Telegram, Intelx (fuites de données), Photo-Map.RU, Strava, Hitta.se (annuaire de personnes), Telegram Group Joiner, Telepathy et TelegramDB. Autres exclusions : Overpass Turbo (doublon), Moz (référencement commercial), Gjirafa (bloqué, plus de service cartographique). Tout est tracé dans `scripts/import/collected-osint.json` → `excluded`.
- URL corrigées après constat en navigateur : mapy.cz → mapy.com, mapa.sk → mapa.zoznam.sk, Global Forest Watch → Global Nature Watch, Google Lens → search.google, RAMMB → slider.cira.colostate.edu, OpenRailwayMap (page wiki → carte), FAA (ancienne page en 503 → page de recherche actuelle). carte.ma est désormais une archive 2013–2015.
- États : 4 « non vérifié » (vérification anti-robots Cloudflare : mapa.zoznam.sk, LiveATC, Telemetr.io, Geo Data Tool) ; 3 « restreint » (Earth Engine, Equasis, IMO : compte requis).
- Tests : unitaires 67/67, base 13/13, E2E 14/14, 15 981 liens internes, 0 cassé, 702 pages.

---

**Documents compagnons :** `01_CONSOLIDATION_ORIGINE_REGLES_METIER.md` · `03_AUDIT_TECHNIQUE.md`
**Règle de reprise :** vérifier l'état réel du code et des services avant toute action destructive ou toute nouvelle création de ressources.
