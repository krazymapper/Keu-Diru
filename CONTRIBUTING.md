# Contribuer à KEU DIRU

## Proposer une ressource
Via le formulaire du site (onglet *Contribuer*) ou un ticket « Proposer une ressource ». Laissez vide ce que vous ne savez pas : **n'inventez ni auteur, ni licence, ni date** (RM-03, RM-04).

## Contribuer au code
1. Ouvrir une issue ou en reprendre une.
2. Branche `feature/…` ou `fix/…` depuis `main`, puis pull request.
3. Avant la PR : `npm test`, `npm run test:db`, `npx astro check`.
4. Toute modification des permissions, du cycle de publication, des données collectées ou des licences doit être documentée **avant** implémentation (règle de gouvernance du document 01).
5. Aucune clé `service_role`, aucun secret, aucune donnée personnelle dans le dépôt.

## Données
Le catalogue de démonstration vit dans `data/seed/`. Après modification : `node scripts/build-seed-sql.mjs` puis `npm test`.
