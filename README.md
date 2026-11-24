# KEU DIRU

**Bibliothèque communautaire, multidisciplinaire et multilingue des savoirs** — cours, tutoriels, jeux de données, outils et sites utiles, organisés et vérifiés par une communauté.

> **État : MVP en construction (v0.1).** Tranche publique fonctionnelle (accueil, exploration, recherche, filtres, fiches, collections, parcours, formulaire de contribution, PWA) sur données de démonstration. Comptes, modération en ligne et synchronisation des favoris : schéma prêt et testé, **non encore connectés** à un projet Supabase.

## Démarrer

```bash
npm ci
npm run dev            # http://localhost:4321/Keu-Diru/
npm test               # tests unitaires (parité URL SQL/TS, i18n, seed, recherche)
npm run test:db        # migrations + RLS exécutées dans PostgreSQL (PGlite)
npm run build          # astro check + build statique dans dist/
```

Node **≥ 22.23** requis (Astro 7).

## Configuration

Copier `.env.example` en `.env`. Sans variables Supabase, le site utilise `data/seed/*.json`.
**Ne jamais** placer la clé `service_role` dans `.env`, le dépôt ou une variable `PUBLIC_*`.

## Brancher Supabase (quand le projet existe)

1. Appliquer `supabase/migrations/*.sql` dans l'ordre, puis `supabase/seed.sql` (généré par `node scripts/build-seed-sql.mjs`).
2. Activer la confirmation d'e-mail et le CAPTCHA dans Supabase Auth.
3. Dans GitHub → Settings → Variables : `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
4. Rejouer `npm run test:db`, puis les tests d'accès sur le projet réel (voir `03_AUDIT_TECHNIQUE.md` §7).

## Documents de référence

| Fichier | Rôle |
|---|---|
| `01_CONSOLIDATION_ORIGINE_REGLES_METIER.md` | Vision, règles métier RM-01 → RM-18 |
| `02_RELAIS.md` | Passation et état d'avancement |
| `03_AUDIT_TECHNIQUE.md` | Audit, corrections, registre des bugs anticipés, décisions attendues |
| `docs/ARCHITECTURE.md` · `docs/DATA-MODEL.md` · `docs/ROADMAP.md` | Technique |

## Licences

À confirmer par le porteur (proposition : code MIT, documentation CC BY 4.0). Les ressources référencées conservent la licence de leurs auteurs ou éditeurs.
