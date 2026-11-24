# Modèle de données

Source de vérité : `supabase/migrations/`. Ce document résume ; en cas d'écart, la migration fait foi.

## Tables
| Table | Rôle | Lecture | Écriture |
|---|---|---|---|
| `languages` | Langues (contenu et interface) | public | éditeur+ |
| `profiles` | Profil (sans rôle) | soi, modérateur+ | soi |
| `user_roles` | editor / moderator / admin | soi, admin | `set_user_role()` (admin) |
| `disciplines`, `topics`, `resource_types`, `tags` | Taxonomies, libellés `jsonb` multilingues | public | éditeur+ |
| `resources` | Ressource, statut, provenance, licence, état du lien | publié ; tout pour éditeur+ | éditeur+ ; suppression admin |
| `resource_translations` | Titre/description par langue, vecteur FTS | si ressource visible | éditeur+ |
| `resource_topics`, `resource_tags` | Liaisons | si ressource visible | éditeur+ |
| `collections`, `collection_items` | Regroupement thématique (ordre facultatif) | publié | éditeur+ |
| `learning_paths`, `learning_path_steps` | Parcours ordonnés (ordre unique, différable) | publié | éditeur+ |
| `favorites`, `learning_progress` | Données privées du membre | soi uniquement | soi uniquement |
| `contributions` | Propositions (nouvelle ressource / modification) | auteur, éditeur+ | auteur (transitions limitées) |
| `contribution_reviews` | Décisions de modération (append-only) | auteur concerné, éditeur+ | `review_contribution()` |
| `audit_log` | Journal (append-only) | modérateur+ | triggers / fonctions |

## Statuts
- Ressource : `draft` → `published` → `archived` | `withdrawn`
- Contribution : `pending` ⇄ `needs_changes` → `approved` | `rejected` ; `withdrawn` par l'auteur
- Lien (RM-08) : `ok`, `restricted`, `temporarily_unreachable`, `broken`, `unverified`

## Fonctions
`normalize_url()`, `immutable_unaccent()`, `ts_config_for()`, `has_min_role()`, `review_contribution()`, `set_user_role()`, `search_resources()`.
