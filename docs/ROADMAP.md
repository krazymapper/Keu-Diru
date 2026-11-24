# Feuille de route

| Phase (02 §11) | État au 2026-11-24 |
|---|---|
| 1. Dépôt, Astro, TS, Tailwind, conventions | **Fait localement** — à pousser sur `krazymapper/Keu-Diru` |
| 2. Interface publique responsive bilingue | **Fait** (v0.1) |
| 3. Catalogue, fiches, taxonomie, collections, filtres | **Fait** sur seed ; taxonomie à valider |
| 4. Modèle de données et recherche | **Schéma + recherche SQL écrits et testés (PGlite)** — non déployés |
| 5. Auth, profils, contributions, modération, RLS | RLS + fonctions testées ; **UI d'auth et de modération à faire** |
| 6. Favoris, parcours, progression | Fait en local (`localStorage`) ; synchro Supabase à faire |
| 7. PWA, tests, accessibilité, sécurité | PWA de base faite ; E2E et audit a11y à faire |
| 8. CI/CD, déploiement, documentation, tests utilisateurs | Workflows écrits ; **premier déploiement en attente du push** |

## Prochaines tâches (ordre recommandé)
1. Pousser le code, activer GitHub Pages (source : GitHub Actions).
2. Créer le projet Supabase, appliquer les migrations, rejouer les tests d'accès sur l'instance réelle.
3. Écrans connexion / inscription (Supabase Auth, lien magique ou OAuth).
4. Soumission réelle des contributions + file de modération (UI).
5. Synchronisation favoris/progression locale → compte.
6. Tests E2E Playwright, audit WCAG 2.1 AA.
7. Atteindre 100 ressources vérifiées (définition : `03_AUDIT_TECHNIQUE.md` m1).
