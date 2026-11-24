# KEU DIRU — Consolidation, origine et règles métier

**Type de document :** Référentiel de cadrage fonctionnel et métier  
**Version :** 1.0  
**Statut :** Document de référence initial — à faire évoluer avec les décisions validées  
**Langues du projet :** Français et anglais au minimum pour le MVP

---

## 1. Objet du document

Ce document consolide les fondements de KEU DIRU, les décisions prises pendant sa conception et les règles métier qui doivent guider sa réalisation.

Il sert de référence commune au porteur du projet, aux développeurs, aux contributeurs, aux modérateurs et à toute intelligence artificielle appelée à participer au projet.

En cas de contradiction entre une ancienne proposition technique et une décision explicitement validée plus récemment par le porteur du projet, la décision validée la plus récente prévaut. Toute modification importante doit être consignée dans le journal des décisions ou dans une nouvelle version de ce document.

## 2. Origine et intention du projet

### 2.1 Nom

**KEU DIRU**

Le nom du projet est validé. Il doit être conservé dans l'interface, la documentation et les supports de communication, sauf décision explicite ultérieure.

### 2.2 Problème auquel le projet répond

Les ressources utiles à l'apprentissage, à la recherche et à la pratique sont dispersées entre de nombreuses plateformes et formats : cours, tutoriels, articles, vidéos, livres, outils, jeux de données, cartes, dépôts de code, sites spécialisés et autres ressources.

Cette dispersion rend leur découverte, leur classement, leur vérification et leur réutilisation difficiles. KEU DIRU vise à organiser ces ressources dans un espace commun, consultable et enrichi par une communauté.

### 2.3 Vision

Construire une base de connaissances multidisciplinaire, publique, communautaire et multilingue qui facilite la découverte, l'organisation, le partage et la transmission de ressources utiles.

KEU DIRU n'a pas vocation à héberger ou reproduire systématiquement tous les contenus référencés. Il peut cataloguer des ressources externes et fournir les informations nécessaires pour les retrouver, les comprendre et les utiliser dans le respect de leurs licences.

### 2.4 Mission

- Recenser des ressources pédagogiques, scientifiques, techniques et pratiques.
- Organiser ces ressources selon des disciplines, sujets, types, langues et niveaux.
- Faciliter leur découverte grâce à la recherche et aux filtres.
- Permettre aux membres de proposer et d'améliorer des références.
- Constituer des collections thématiques.
- Construire des parcours d'apprentissage progressifs.
- Favoriser l'accès à la connaissance et la contribution communautaire.

### 2.5 Principes directeurs

1. **Ouverture :** le catalogue public doit être consultable sans obligation de créer un compte.
2. **Communauté :** les membres peuvent proposer des ressources et contribuer à leur amélioration.
3. **Qualité :** une contribution n'est pas automatiquement publiée ; elle suit un processus de vérification.
4. **Traçabilité :** les sources, auteurs, éditeurs, licences et modifications doivent être documentés lorsque ces informations sont disponibles.
5. **Multilinguisme :** le modèle doit permettre d'ajouter des langues sans refonte de la base de données.
6. **Accessibilité :** l'interface doit être responsive, claire et utilisable sur des connexions et appareils variés.
7. **Respect des droits :** les licences des ressources référencées restent celles de leurs ayants droit.
8. **Progressivité :** le produit doit être construit par étapes, en privilégiant un MVP cohérent et maintenable.

## 3. Périmètre fonctionnel validé

### 3.1 Public cible

KEU DIRU s'adresse notamment aux apprenants, étudiants, enseignants, chercheurs, professionnels, autodidactes, formateurs, communautés techniques et organisations qui souhaitent découvrir ou partager des ressources.

Le projet est multidisciplinaire. Il ne doit pas être limité à la géomatique, aux SIG ou à un seul domaine.

### 3.2 Accès et langues

- Le catalogue est public.
- Le français et l'anglais sont les langues minimales du MVP.
- L'architecture doit permettre d'ajouter d'autres langues ultérieurement.
- La langue de l'interface et la langue d'une ressource sont deux informations distinctes.

### 3.3 Expérience et direction visuelle

La direction validée est **hybride** :
- une bibliothèque éditoriale pour parcourir et découvrir les ressources ;
- un tableau de bord pour accéder aux fonctions personnelles et communautaires.

L'interface doit rester lisible, moderne, cohérente et sobre. Le tableau de bord ne doit pas rendre la consultation publique inutilement complexe.

### 3.4 Fonctionnalités prévues dans le MVP

- Catalogue public de ressources.
- Recherche.
- Filtres par discipline, sujet, type, langue et niveau, selon les métadonnées disponibles.
- Pages de détail des ressources.
- Collections thématiques.
- Favoris pour les membres connectés.
- Formulaire de contribution/proposition de ressource.
- Processus de modération.
- Parcours d'apprentissage ordonnés.
- Interface française et anglaise.
- Application web progressive (PWA), avec stratégie hors ligne prudente.
- Interface responsive.

Les fonctionnalités doivent être livrées de façon incrémentale. Leur présence dans ce périmètre ne signifie pas qu'elles sont déjà développées.

## 4. Vocabulaire métier

| Terme | Définition |
|---|---|
| Ressource | Élément référencé dans le catalogue : cours, tutoriel, dataset, outil, article, vidéo, livre, site, dépôt, etc. |
| Discipline | Grand domaine de connaissance auquel une ressource peut être rattachée. |
| Sujet / thème | Domaine plus précis au sein d'une discipline ou thème transversal. |
| Type de ressource | Nature du contenu : cours, tutoriel, dataset, outil, article, vidéo, livre, etc. |
| Collection | Regroupement thématique de ressources, sans ordre pédagogique obligatoire. |
| Parcours d'apprentissage | Séquence ordonnée d'étapes et de ressources visant un objectif d'apprentissage. |
| Contribution | Proposition ou modification soumise par un membre. |
| Modération | Processus de vérification et de décision avant publication ou modification sensible. |
| Favori | Ressource enregistrée par un membre pour la retrouver facilement. |
| Progression | État d'avancement d'un membre dans un parcours d'apprentissage. |

**Distinction essentielle :** une collection répond à la question « quelles ressources réunir ? » ; un parcours répond à la question « dans quel ordre apprendre ? ».

## 5. Acteurs, rôles et permissions

Les rôles suivants constituent le modèle fonctionnel de référence. Leur implémentation exacte (rôles globaux, permissions granulaires ou combinaison des deux) devra être précisée dans les migrations et politiques d'accès.

### 5.1 Visiteur

- Consulte les ressources publiées.
- Effectue des recherches et utilise les filtres.
- Consulte les disciplines, collections et parcours publics.
- N'accède pas aux données personnelles ou fonctions réservées aux membres.

### 5.2 Membre

- Dispose des droits du visiteur.
- Peut proposer une ressource.
- Peut enregistrer ses favoris.
- Peut gérer ses propres informations et contributions selon les règles de la plateforme.
- Peut suivre sa progression dans les parcours si cette fonction est activée.

### 5.3 Éditeur

- Examine et améliore les métadonnées des ressources.
- Corrige les erreurs et les liens.
- Peut préparer des modifications pour validation selon la politique de modération.
- Ne doit pas pouvoir contourner les restrictions de sécurité.

### 5.4 Modérateur

- Examine les contributions.
- Approuve, refuse ou renvoie une proposition pour correction.
- Documente les motifs de décision lorsque nécessaire.
- Ne doit pas publier une ressource qui ne respecte pas les critères de qualité et de droits.

### 5.5 Administrateur

- Gère la configuration, les rôles et les paramètres de la plateforme.
- Supervise les contenus, les taxonomies et la modération.
- Dispose de permissions techniques limitées au strict nécessaire et auditées.

Le principe de moindre privilège s'applique à tous les rôles.

## 6. Règles métier

Les règles ci-dessous constituent le socle métier. Les détails non encore arbitrés sont identifiés comme points à confirmer plutôt que présentés comme des décisions déjà prises.

### RM-01 — Publication publique

Seules les ressources ayant un statut de publication autorisé sont visibles dans le catalogue public. Une proposition en attente, refusée ou retirée ne doit pas apparaître comme une ressource publiée.

### RM-02 — Contribution soumise à validation

La soumission d'une ressource par un membre ne déclenche pas automatiquement sa publication. Elle crée une contribution qui doit être contrôlée selon le processus de modération.

### RM-03 — Métadonnées minimales

Une proposition doit fournir au minimum :
- un titre ;
- une URL ou une indication claire de localisation/accès, sauf pour un cas de ressource locale explicitement accepté ;
- un type de ressource ;
- une discipline ou un domaine pertinent ;
- une description suffisamment informative ;
- la langue de la ressource, si elle est identifiable.

Les champs obligatoires exacts seront fixés dans le schéma de validation du formulaire. Les informations inconnues ne doivent pas être inventées.

### RM-04 — Provenance et attribution

Lorsque l'information est disponible, chaque ressource doit conserver :
- son auteur ou organisme producteur ;
- son éditeur ou organisme diffuseur ;
- sa source ou URL ;
- sa licence ou ses conditions d'utilisation ;
- sa date de publication ou de mise à jour.

L'absence d'une information doit être signalée comme inconnue/non renseignée, et non remplacée par une supposition.

### RM-05 — Respect des licences

KEU DIRU référence les ressources et respecte les licences déclarées par leurs auteurs ou éditeurs. La licence du code de KEU DIRU ou de sa documentation ne s'applique pas automatiquement aux ressources externes.

Toute copie, adaptation, redistribution ou intégration de fichiers doit être autorisée par la licence applicable.

### RM-06 — Prévention des doublons

Avant publication, une contribution doit être comparée aux ressources existantes, notamment par URL normalisée, titre et source. Une correspondance probable doit être examinée par un humain ; une similarité automatique ne suffit pas à supprimer une contribution.

### RM-07 — Qualité et pertinence

Une ressource publiée doit être pertinente pour le catalogue, suffisamment documentée, accessible ou clairement signalée comme restreinte, et ne pas être manifestement trompeuse, dangereuse ou contraire aux règles de la communauté.

### RM-08 — État des liens

Les liens peuvent être vérifiés automatiquement ou manuellement. Un échec temporaire d'accès ne prouve pas à lui seul que la ressource est définitivement indisponible. Il faut distinguer au minimum :
- lien fonctionnel ;
- accès restreint ou authentification requise ;
- lien temporairement inaccessible ;
- lien cassé ou ressource retirée ;
- état non vérifié.

La fréquence de vérification automatique reste à définir.

### RM-09 — Langue de l'interface et langue du contenu

La langue d'affichage de l'interface ne doit pas être confondue avec la langue d'une ressource. Une ressource en anglais doit pouvoir être découverte depuis l'interface française, et inversement.

### RM-10 — Traductions extensibles

Les traductions des titres et descriptions doivent être stockées dans un modèle extensible, par exemple une table de traductions liée à la ressource avec un code de langue. Éviter un schéma limité à des colonnes fixes telles que `title_fr` et `title_en`, qui rendrait l'ajout de langues difficile.

### RM-11 — Collections

Une collection regroupe des ressources autour d'un thème, d'un usage ou d'un public. L'ordre des éléments peut être facultatif ou éditorial, mais ne constitue pas à lui seul une progression pédagogique. La visibilité et les permissions de création/édition des collections devront être définies dans les règles d'administration.

### RM-12 — Parcours d'apprentissage

Un parcours comprend un objectif, un public ou niveau cible, une description et une suite ordonnée d'étapes. Chaque étape peut référencer une ressource et/ou une consigne. L'ordre des étapes doit être conservé. La progression personnelle d'un membre est privée par défaut, sauf décision explicite contraire.

### RM-13 — Favoris

Un membre ne peut gérer que ses propres favoris. Un favori ne rend pas une ressource privée et ne modifie pas son statut de publication.

### RM-14 — Données personnelles

Ne collecter que les données nécessaires au fonctionnement. Les données de profil, favoris, contributions non publiques et progression doivent être protégées par des contrôles d'accès adaptés. Les utilisateurs ne doivent pas pouvoir lire ou modifier les données privées d'autres membres.

### RM-15 — Traçabilité des décisions

Les décisions de modération importantes et les changements de statut doivent pouvoir être retracés. Le niveau de journalisation, la durée de conservation et les droits de consultation seront définis avant la mise en production.

### RM-16 — Sécurité par défaut

Toute table exposée via l'API doit être protégée par des politiques d'accès. Les règles de sécurité doivent être testées. Une clé administrative ou `service_role` ne doit jamais être intégrée au code frontend, au dépôt public ou à une variable accessible au navigateur.

### RM-17 — Fonctionnement hors ligne

La PWA peut mettre en cache les éléments publics appropriés et conserver localement certaines préférences, comme les favoris, si une stratégie de synchronisation sûre est mise en place. Les jetons d'authentification, secrets et données privées ne doivent pas être mis en cache de façon imprudente.

### RM-18 — Suppression et retrait

Le retrait d'une ressource publiée doit être contrôlé et traçable. Il convient de privilégier un statut de retrait/archivage lorsqu'une conservation de l'historique est nécessaire, plutôt qu'une suppression irréversible sans audit. La politique définitive reste à arbitrer.

## 7. Cycle de vie d'une contribution

Flux de référence :

1. Un membre remplit le formulaire de proposition.
2. Le système valide les champs et formats.
3. Des contrôles automatiques peuvent vérifier l'URL, les champs requis et les doublons probables.
4. La contribution est enregistrée avec un statut en attente.
5. Un éditeur ou modérateur examine la pertinence, la qualité, la provenance et les droits.
6. La décision est enregistrée :
   - **Approuvée :** la ressource est publiée ou la modification est appliquée ;
   - **À corriger :** le contributeur reçoit les demandes de modification ;
   - **Refusée :** le motif est conservé lorsque cela est pertinent.
7. Les changements sont traçables.

Les noms techniques définitifs des statuts (par exemple `pending`, `needs_changes`, `approved`, `rejected`, `published`) doivent être normalisés dans le modèle de données et utilisés de manière cohérente.

## 8. Métadonnées recommandées d'une ressource

Le modèle métier doit pouvoir représenter les informations suivantes, selon leur disponibilité :

| Champ logique | Description |
|---|---|
| Identifiant | Identifiant unique et stable |
| Slug | Identifiant lisible pour l'URL |
| Titre | Titre de la ressource, traduisible si nécessaire |
| Description | Présentation et utilité de la ressource |
| Type | Cours, tutoriel, dataset, outil, article, vidéo, livre, site, dépôt, etc. |
| Discipline | Domaine principal |
| Sujets | Un ou plusieurs thèmes |
| Langue | Langue du contenu |
| Niveau | Débutant, intermédiaire, avancé ou valeur contrôlée |
| URL | Adresse de la ressource |
| Auteur | Personne ou organisme auteur |
| Éditeur | Organisation ou plateforme de diffusion |
| Formats | PDF, vidéo, web, CSV, GeoPackage, code, etc. |
| Tags | Mots-clés transversaux |
| Date d'ajout | Date d'entrée dans le catalogue |
| Date de mise à jour | Dernière mise à jour des métadonnées |
| Licence | Licence ou conditions d'utilisation connues |
| Coût d'accès | Gratuit, payant, freemium, institutionnel, inconnu, etc. |
| Statut | État éditorial/publication |
| Vérification | État et date du dernier contrôle de lien |
| Notes | Informations complémentaires |

Ce tableau décrit un modèle logique, pas une obligation de créer immédiatement une colonne par ligne. Les champs doivent être normalisés selon les besoins réels.

## 9. Architecture et décisions techniques consolidées

### 9.1 Frontend

- Astro avec TypeScript.
- React pour les composants nécessitant une forte interactivité.
- Tailwind CSS pour le style.
- Zod pour la validation côté application.
- Lucide pour les icônes.
- shadcn/ui peut être utilisé de manière optionnelle si cela sert la cohérence de l'interface.

### 9.2 Backend et données

- Supabase pour PostgreSQL, authentification et stockage si nécessaire.
- API Supabase utilisée depuis le frontend avec une clé publique/publishable et des politiques RLS correctement configurées.
- PostgreSQL Full Text Search et `pg_trgm` envisagés pour la recherche du catalogue dynamique.
- Pagefind peut être envisagé pour indexer des pages statiques, mais ne remplace pas la recherche des données dynamiques.

### 9.3 Hébergement et dépôt

- GitHub pour le code, la documentation, les migrations, les issues et les contributions.
- GitHub Actions pour les contrôles et le déploiement.
- GitHub Pages a été envisagé pour l'hébergement initial du frontend statique. Il ne peut pas exécuter un backend serveur ; le frontend doit appeler un backend/API externe tel que Supabase.
- L'URL de production et le nom du compte GitHub ne sont pas encore confirmés dans le cadrage disponible.

### 9.4 PWA

- Manifest web.
- Service worker.
- Cache des contenus publics avec stratégie contrôlée.
- IndexedDB éventuellement pour les données locales nécessaires.
- Synchronisation au retour de la connexion, avec gestion des conflits et des erreurs.

### 9.5 Sécurité

- RLS activé et testé sur les tables exposées.
- Permissions minimales.
- Secrets uniquement côté serveur ou dans les environnements sécurisés appropriés.
- Aucune clé `service_role` dans le navigateur ou le dépôt.
- Tests des accès anonymes, membres, éditeurs, modérateurs et administrateurs.

## 10. Modèle de données envisagé

Les entités identifiées à ce stade sont :

- `profiles`
- `disciplines`
- `topics`
- `resource_types`
- `resources`
- `resource_translations`
- `resource_topics`
- `tags`
- `resource_tags`
- `collections`
- `collection_items`
- `learning_paths`
- `learning_path_steps`
- `favorites`
- `contributions`
- `contribution_reviews`
- `learning_progress`

Ce modèle est une cible de conception. Il ne faut pas considérer que toutes ces tables existent déjà.

Un premier SQL exploratoire avait été évoqué pour `profiles`, `disciplines`, `topics`, `resources`, `resource_topics`, `favorites`, `contributions` et des index. Il ne constitue pas une migration complète de production. Il reste notamment à préciser les contraintes, relations, traductions, statuts, politiques RLS, fonctions/triggers et tests.

## 11. Principes de licences et de contribution au projet

Proposition de base déjà envisagée :
- Code source de KEU DIRU : MIT.
- Documentation originale du projet : CC BY 4.0.
- Ressources externes : conserver la licence et les conditions définies par chaque auteur ou éditeur.

Ces choix doivent être confirmés avant publication des fichiers de licence définitifs. Ne jamais appliquer automatiquement la licence MIT ou CC BY aux contenus externes référencés.

## 12. Objectifs indicatifs du MVP

Les chiffres suivants sont des objectifs de lancement, pas des résultats atteints :

- 12 disciplines initiales ;
- 100 ressources validées ;
- 5 collections ;
- 3 parcours d'apprentissage ;
- interface française et anglaise ;
- recherche et filtres opérationnels ;
- contribution avec modération ;
- interface responsive et PWA de base.

Ces objectifs peuvent être révisés selon les ressources humaines, le temps et le budget disponibles.

## 13. Points restant à arbitrer

Les points suivants ne doivent pas être inventés par un intervenant :

1. Création du dépôt GitHub et URL exacte.
2. Nom de domaine et hébergement final.
3. Choix final du plan Supabase et limites budgétaires.
4. Taxonomie initiale des disciplines, sujets et types.
5. Liste exacte des champs obligatoires du formulaire de contribution.
6. Politique détaillée de visibilité et de création des collections.
7. Politique de retrait, archivage et suppression.
8. Durée de conservation des journaux de modération et données personnelles.
9. Fréquence et méthode de vérification des liens.
10. Politique de gestion des traductions et langue par défaut.
11. Stratégie de sauvegarde et restauration.
12. Tests de sécurité et critères de mise en production.

## 14. Journal des décisions et évolutions

| Version | Décision / évolution | Statut |
|---|---|---|
| 1.0 | Consolidation des choix validés : nom, vocation communautaire, accès public, multilinguisme FR/EN, design hybride et fonctionnalités MVP | Référence initiale |
| À compléter | Toute nouvelle décision métier ou technique validée | À documenter |

---

**Règle de gouvernance documentaire :** toute modification qui change les permissions, le cycle de publication, les données collectées, les licences ou la visibilité des contenus doit être documentée avant son implémentation.
