# Sécurité

## Signaler une vulnérabilité
Ne pas ouvrir de ticket public. Utiliser **Security → Report a vulnerability** sur GitHub (signalement privé) — à activer dans les paramètres du dépôt.

## Règles
- RLS activée sur toutes les tables exposées ; chaque politique a un test d'accès non autorisé (`supabase/tests/`).
- Seule la clé **publique** Supabase est utilisée côté navigateur. La clé `service_role` ne quitte jamais un environnement serveur sécurisé.
- Publication et attribution des rôles uniquement via des fonctions contrôlées et journalisées.
- Le service worker ne met en cache ni requêtes authentifiées, ni domaines tiers.
