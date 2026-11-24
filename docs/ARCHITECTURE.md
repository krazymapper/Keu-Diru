# Architecture (implémentée en v0.1)

| Couche | Choix | Fichiers |
|---|---|---|
| Site | Astro 7, sortie **statique**, routes `/fr/…` et `/en/…` | `src/pages/[lang]/` |
| Îlots interactifs | React 19 (`Explorer`, `ContributeForm`, `FavoriteButton`, `PathProgress`, `Dashboard`) | `src/components/*.tsx` |
| Styles | Tailwind 4, polices système (zéro requête externe) | `src/styles/global.css` |
| Validation | Zod 4 (seed, catalogue Supabase, formulaire) | `src/lib/schema.ts` |
| Données au build | Supabase (clé publique, RLS) sinon seed JSON | `src/lib/catalog.ts` |
| Recherche | Client sur `catalog.json` ; SQL `search_resources()` prête pour la montée en charge | `src/lib/search.ts`, migration 003 |
| Base | PostgreSQL Supabase, RLS sur toutes les tables, publication via fonctions SECURITY DEFINER | `supabase/migrations/` |
| PWA | Manifest + service worker (cache prudent, même origine uniquement) | `public/sw.js` |
| CI/CD | GitHub Actions : vérification, déploiement Pages (push, quotidien, dispatch), liens | `.github/workflows/` |

## Flux de publication
Contribution (membre) → `contributions` *pending* → `review_contribution()` (modérateur, transaction unique) → `resources` *published* → reconstruction du site (quotidienne ou `repository_dispatch`).

## Décisions et limites
Voir `03_AUDIT_TECHNIQUE.md` §5 à §7.
