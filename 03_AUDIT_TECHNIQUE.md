# KEU DIRU — Audit technique, corrections et registre des risques

**Type de document :** Audit de cadrage + journal de la première implémentation
**Version :** 1.0 — 2026-11-24
**Portée :** `01_CONSOLIDATION_ORIGINE_REGLES_METIER.md` v1.0 et `02_RELAIS.md` v1.0, confrontés à une première implémentation réelle
**Convention de statut :** **validé** (par le porteur) · **proposé** (par l'audit, à valider) · **implémenté** (code écrit) · **testé** (preuve automatisée)

---

## 1. Verdict

Le cadrage est **solide sur le fond** : principes clairs, règles métier bien posées (en particulier RM-03/04 « ne rien inventer », RM-06 « pas de suppression automatique », RM-16 sécurité), distinction nette entre décidé et proposé.

Il présente en revanche **quatre trous structurants** qui auraient produit des bugs ou des failles dès le premier déploiement, et une dizaine d'imprécisions. Aucun n'invalide la vision ; tous ont reçu une correction **proposée et implémentée**, dont la majorité est **testée**.

| Gravité | Nombre | Corrigés et testés | Corrigés, non testés automatiquement | À arbitrer |
|---|---|---|---|---|
| Critique | 4 | 3 | 1 | 0 |
| Majeure | 10 | 4 | 4 | 2 |
| Mineure | 7 | 0 | 3 | 4 |

## 2. Insuffisances critiques

### C1 — Contradiction « site statique GitHub Pages » / « catalogue dynamique »
**Constat.** Les documents retiennent GitHub Pages (statique) et un catalogue alimenté par des contributions. Rien n'indique comment une ressource approuvée obtient sa page : sans reconstruction du site, elle reste invisible ou en 404.
**Correction (proposé, implémenté).** Pages générées au build depuis Supabase (repli sur le seed) + reconstruction **quotidienne** planifiée + déclencheur `repository_dispatch: catalog-updated` appelable par un webhook après modération (`.github/workflows/deploy.yml`).
**Reste à faire.** Brancher le webhook Supabase → GitHub ; délai de publication ≤ 24 h à accepter ou à réduire.

### C2 — Aucun modèle physique des rôles → risque d'escalade de privilèges
**Constat.** Le §5 décrit cinq rôles sans dire où ils sont stockés. Le schéma exploratoire évoqué met naturellement un champ `role` dans `profiles` — table que chaque membre peut modifier : un membre pourrait se déclarer administrateur.
**Correction (implémenté, testé).** Table `user_roles` séparée, non modifiable par l'API ; attribution uniquement via `set_user_role()` réservée aux admins et journalisée ; un admin ne peut pas retirer son propre rôle (évite le verrouillage). « Membre » = tout compte authentifié, non stocké.

### C3 — Publication non atomique et contournable
**Constat.** Le §7 décrit l'approbation comme une suite d'actions ; implémentée côté frontend (mettre à jour la contribution, créer la ressource, créer la traduction…), elle peut s'arrêter à mi-chemin ou être rejouée par un client modifié.
**Correction (implémenté, testé).** Fonction `review_contribution()` **SECURITY DEFINER** : contrôle du rôle (modérateur+), verrou de ligne, création ressource + traduction + revue + audit dans une seule transaction. **Séparation des tâches** : un modérateur ne peut pas valider sa propre contribution. Un éditeur ne peut pas approuver (RM-02 respectée à la lettre).

### C4 — Les taxonomies ne sont pas traduisibles
**Constat.** RM-10 ne prévoit de traductions que pour les ressources (`resource_translations`). Disciplines, types, sujets, collections et parcours seraient restés monolingues — incompatible avec une interface FR/EN.
**Correction (implémenté, testé).** Libellés en `jsonb` `{ "fr": …, "en": … }` avec contrainte « FR et EN obligatoires », extensible à toute langue sans migration (esprit de RM-10 conservé).

## 3. Insuffisances majeures

| # | Constat | Correction | Statut |
|---|---|---|---|
| M1 | Statuts ambigus : `approved` et `published` mélangés dans une même liste (§7) | Deux cycles distincts : `resource_status` (draft, published, archived, withdrawn) et `contribution_status` (pending, needs_changes, approved, rejected, withdrawn). Transitions contributeur limitées par trigger | Testé |
| M2 | Recherche FTS : dictionnaire non choisi ; `french` dégraderait l'anglais ; `unaccent` non IMMUTABLE (index impossible) | Double vecteur `simple` + racinisé selon la langue de la traduction ; wrapper `immutable_unaccent` ; similarité par mot (`pg_trgm`) | Testé |
| M3 | RM-06 parle d'« URL normalisée » sans la définir | `normalize_url()` SQL (hôte, www, ports, traceurs utm/fbclid, tri des paramètres, fragment) + miroir TypeScript + **test de parité** | Testé |
| M4 | Contributions de *modification* évoquées (§5.3) mais non modélisées | `kind = edit_resource` + `target_resource_id` ; application des champs principaux à l'approbation | Implémenté — à étendre (traductions, sujets) |
| M5 | Aucun anti-abus alors que la clé publique est exposée et l'inscription libre | Plafond de 20 contributions ouvertes par membre (valeur **proposée**) | Testé — à compléter : CAPTCHA et confirmation e-mail Supabase Auth |
| M6 | Données personnelles sans politique de confidentialité ni mentions légales | — | **À arbitrer** : cadre juridique applicable (Bénin, et UE si public européen) à faire vérifier par une personne compétente avant ouverture des comptes |
| M7 | Dépendance à Supabase pour afficher le site : un projet gratuit peut être suspendu en cas d'inactivité (conditions à vérifier dans l'offre en vigueur) | Le site public est statique ; repli sur le seed si Supabase est injoignable ; `KEU_STRICT_DATA=1` en production pour échouer plutôt que publier des données périmées | Implémenté |
| M8 | Le relais suppose un dépôt `keu-diru` ; le dépôt réel est `krazymapper/Keu-Diru`. GitHub Pages est **sensible à la casse** | `base: '/Keu-Diru'` + helper `withBase()` robuste ; surcharge par `BASE_PATH` | Implémenté |
| M9 | Accessibilité énoncée sans critère mesurable | Cible proposée : WCAG 2.1 AA. Fait : contrastes ≥ 4,5:1, focus visible, cibles ≥ 44 px, lien d'évitement, `lang` par bloc, `aria-live` sur résultats | Implémenté — audit outillé (axe, lecteur d'écran) à faire |
| M10 | Licences MIT / CC BY 4.0 « à confirmer » mais faciles à publier par erreur | Pas de fichier `LICENSE` ; `package.json` en `UNLICENSED` jusqu'à décision | **À arbitrer** |

## 4. Insuffisances mineures

- **m1 — « 100 ressources vérifiées » non défini.** Proposé : *vérifiée* = métadonnées minimales RM-03 + lien contrôlé `ok` ou `restricted` + revue humaine. À valider.
- **m2 — Vérification des liens sans garde-fou contre les faux positifs.** Script `scripts/check-links.mjs` en mode **rapport** seulement, classement RM-08, passage à `broken` réservé à une confirmation. Hebdomadaire (**proposé**).
- **m3 — SEO et partage absents.** `canonical`, `hreflang`, Open Graph, JSON-LD `LearningResource` ajoutés.
- **m4 — Gouvernance éditoriale non décrite** : qui modère, délai de traitement, charte communautaire, procédure de recours. À arbitrer.
- **m5 — Modèle de branches `develop`/`feature` lourd pour une petite équipe.** Recommandé tant que l'équipe < 3 personnes : `main` protégée + PR + CI obligatoire.
- **m6 — shadcn/ui** : inutile pour 5 îlots interactifs ; non installé (moins de dépendances, bundle plus léger).
- **m7 — Aucune mesure d'usage** pour suivre les objectifs MVP. Proposer un outil respectueux de la vie privée, sans cookie. À arbitrer.

## 5. Architecture retenue (proposée)

```
Navigateur ──► GitHub Pages (HTML statique FR/EN, catalog.json, PWA)
     │                    ▲ build quotidien / sur dispatch / sur push
     │                    │
     └──► Supabase (Auth, contributions, favoris, progression, modération — RLS)
                          │
                          └── lecture des ressources publiées au build (clé publique)
```

- **Lecture publique** : 100 % statique → rapide, hors ligne, survit à une panne Supabase.
- **Recherche** : côté client sur `catalog.json` (instantanée, hors ligne). Seuil de bascule vers `search_resources()` (SQL, déjà écrite et testée) : quelques milliers de ressources ou index > 1–2 Mo.
- **Écriture** : uniquement via Supabase, toujours sous RLS ; publication uniquement via `review_contribution()`.
- **Favoris / progression** : `localStorage` tant que l'authentification n'est pas branchée, avec clés versionnées pour migration.

## 6. Registre des bugs anticipés

| # | Bug | Détection | Statut |
|---|---|---|---|
| B1 | `ON CONFLICT` refusé sur une contrainte `DEFERRABLE` (seed des parcours) | **Détecté par le banc de test** | Corrigé |
| B2 | Recherche publique en échec : `permission denied for schema extensions` pour `anon` | **Détecté** | Corrigé (`GRANT USAGE` explicite) |
| B3 | « cartographie » ne trouve pas « cartographiques » (pas de racinisation) | **Détecté** | Corrigé (vecteur racinisé) |
| B4 | Usurpation de l'auteur d'une contribution (`submitted_by` forgé) | Test | Neutralisé (réécrit par trigger) |
| B5 | Escalade de rôle par un membre | Test | Bloqué |
| B6 | Auto-validation d'un modérateur | Test | Bloqué |
| B7 | `unaccent()` non IMMUTABLE dans colonne générée / index | Prévenu | Wrapper |
| B8 | Normalisation d'URL dépendante de la collation (tri des paramètres) | Prévenu | `COLLATE "C"` + parité testée |
| B9 | Liens cassés sous `/Keu-Diru/` (base path, casse, double `/`) | Prévenu | `withBase()` |
| B10 | Écart d'hydratation React (URL lue côté serveur) | Prévenu | Lecture dans `useEffect` |
| B11 | `localStorage` qui lève une exception (navigation privée, quota) | Prévenu | `try/catch` |
| B12 | Service worker qui met en cache l'auth / Supabase ou sert une vieille version | Prévenu | Même origine uniquement, pas d'`Authorization`, HTML réseau d'abord, cache versionné |
| B13 | Service worker actif en développement (modifications invisibles) | Prévenu | Enregistré en production seulement |
| B14 | CI en échec avec Node < 22.23 (exigence d'Astro 7) | Prévenu | `node-version: 22.x` |
| B15 | Build cassé si Supabase est suspendu | Prévenu | Repli seed / mode strict |
| B16 | Favori pointant vers une ressource retirée | Prévenu | Filtré à l'affichage |
| B17 | Clé de traduction manquante en anglais | Prévenu | Typage + test |
| B18 | Collision en réordonnant les étapes d'un parcours | Prévenu | Contrainte `DEFERRABLE` |
| B19 | Parcours cassé par la suppression d'une ressource | Prévenu | `ON DELETE RESTRICT` |
| B20 | Suppression de compte → `ON DELETE CASCADE` efface ses contributions et une partie de l'historique de modération | Identifié | **À arbitrer** (droit à l'effacement vs RM-15) |
| B21 | URL de ticket GitHub trop longue (formulaire de contribution) | Prévenu | Troncature |
| B22 | « Ajouts récents » en mode démo = ordre du fichier (pas de date dans le seed) | Identifié | Limite connue, correct avec Supabase |

## 7. Ce qui n'est PAS prouvé

- **PGlite ≠ Supabase.** Les migrations et la RLS sont testées dans un vrai PostgreSQL (WASM) avec un bouchon du schéma `auth`. Restent à tester sur un projet Supabase réel : Auth réelle, JWT, PostgREST, droits par défaut, webhooks.
- **Aucun test de bout en bout navigateur** (Playwright prévu, non exécuté).
- **Liens du seed non vérifiés** depuis l'environnement de travail (réseau sortant restreint) : tous en `unverified`, conformément à RM-08.
- **Accessibilité** non auditée avec des outils ou un lecteur d'écran.

## 8. Valeurs choisies par l'audit faute de décision (à valider)

Aucune donnée chiffrée ou factuelle n'a été inventée. Les choix suivants sont des **paramètres proposés**, signalés comme tels :
- taxonomie de 12 disciplines, 9 types, 6 sujets ;
- 2 collections et 1 parcours **de démonstration** (ressources réelles) ;
- plafond anti-abus : 20 contributions ouvertes par membre ;
- fréquence de vérification des liens : hebdomadaire ; reconstruction du site : quotidienne ;
- longueurs minimales : titre 3, description 20 (base) / 40 (formulaire) caractères ;
- licences des ressources du seed renseignées **uniquement** lorsqu'elles étaient connues avec certitude, sinon « Non renseigné ».

## 9. Décisions attendues du porteur (par priorité)

1. Autoriser l'envoi du code sur `krazymapper/Keu-Diru` (dépôt actuellement vide).
2. Créer (ou confirmer) le projet Supabase et fournir l'URL + la clé **publique** (jamais la `service_role`).
3. Valider ou amender la taxonomie proposée.
4. Collections : création réservée aux éditeurs (implémenté) ou ouverte aux membres ?
5. Suppression de compte : anonymiser les contributions (recommandé) ou les effacer (B20) ?
6. Licences du code et de la documentation.
7. Seuil anti-abus, fréquences de contrôle, outil de mesure d'audience.
