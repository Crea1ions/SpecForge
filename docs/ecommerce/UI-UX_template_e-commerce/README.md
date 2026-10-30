# Rust E-commerce · prototype R&D 

Prototype statique HTML/CSS/JavaScript, sans API, backend, dépendance distante ni service externe. Les données et les actions restent locales au navigateur et servent uniquement à valider les écrans et parcours.

## Rôle de référence UI/UX

Ce prototype a servi de référence visuelle et de parcours pour l'interface générée du preset `rust-ecommerce` : boutique, espace client, administration, navigation responsive, thème et organisation des contenus. L'application générée conserve ses propres composants et branchements métier ; elle ne reprend pas les données fictives ni les interactions simulées de ce prototype.

Pour les décisions d'architecture et le contrat métier, consulter [l'ADR e-commerce](../ADR-TEMPLATE-ECOMMERCE.md) et le [modèle de domaine V2](../MODELE-DOMAINE-V2.md). La source du frontend généré se trouve dans [`ecommerce-frontend.ts`](../../../src/core/bricks/ecommerce-frontend.ts).

## Démarrage

1. Ouvrir `index.html` dans un navigateur récent (Chrome, Firefox ou Edge), ou servir le dossier avec un serveur HTTP statique.
2. La boutique s'ouvre sur l'accueil.
3. Les espaces client et administration sont accessibles depuis la navigation ou les liens de pied de page.

Le fichier `atelier-sepia-ecommerce-v2-final.html` livré séparément est autonome : CSS et JavaScript sont intégrés au HTML. Il ne nécessite aucun autre fichier.

## Espaces et parcours

### Boutique publique
- Accueil, catégories, sélection de produits, catalogue avec recherche et filtres.
- Fiche produit, disponibilité et quantité, panier avec modification et suppression.
- Checkout avec adresse et mode de livraison.
- Le compte client est obligatoire avant le checkout, conformément au modèle de domaine v1 ; le panier est conservé pendant la connexion simulée.
- Le scénario de paiement peut être accepté ou refusé. Un refus conserve le panier et ne crée aucune commande confirmée.
- Pages de contenu publiques avec visibilité calculée à partir du statut et de la date de publication.

### Espace client
- Connexion et création de compte simulées.
- Historique et détail des commandes.
- Suivi d'expédition séparé du statut de paiement.
- Demande de retour sur une commande livrée, avec choix d'un article et d'une quantité.
- Documents disponibles en aperçu HTML imprimable : confirmation, proforma de démonstration, bon de livraison selon l'état, récapitulatif de retour.
- Facture et avoir explicitement indiqués comme non émis/non générés dans cette R&D. Aucun document fiscal conforme n'est promis.

Comptes client préchargés :
- `camille@example.fr`
- `ines@example.fr`
- `louis@example.fr`

Utiliser n'importe quel mot de passe de 4 caractères minimum.

### Administration
La connexion propose trois profils de démonstration :

| Profil | Rubriques visibles | Limites illustrées |
|---|---|---|
| Gestionnaire | Vue d'ensemble, catalogue, commandes, clients, retours, paniers abandonnés, pages et statistiques | Accès complet à la console simulée |
| Opérateur | Commandes, clients, retours, paniers abandonnés et commandes impayées depuis les raccourcis | Pas de gestion des prix, réglages ou statistiques |
| Éditeur de contenu | Pages, menus et catalogue | Pas d'accès aux prix, stocks ou paramètres de gestion |

La console comprend :
- Tableau de bord sur période sélectionnable, avec commandes confirmées, ventes TTC, panier moyen, retours/remboursements séparés, produits principaux et alertes de stock.
- Analyse en lecture seule regroupée par date UTC, produit, catégorie ou pays.
- Gestion du catalogue, SKU unique, états actif/vendable/publié, stock et seuil d'alerte.
- Commandes avec statuts de paiement et de livraison indépendants.
- Vues séparées pour devis impayés et paniers abandonnés ; relance manuelle simulée une seule fois.
- Traitement des retours par étapes : demande, acceptation/refus, réception, remboursement et réintégration du stock.
- Édition de pages : titre, libellé, slug unique, publication, date programmée, indexation, emplacement de menu, duplication et aperçu.

## États de démonstration disponibles

- Catalogue : contenu, recherche sans résultat, chargement, indisponibilité.
- Tableau de bord : contenu, chargement, erreur.
- Catalogue admin : contenu et vue vide.
- Commandes client : contenu et vue vide.
- Retours : aucun dossier, demande en attente et dossier traité.
- Paniers abandonnés : contenu et vue vide.
- Pages : brouillon, publiée, programmée ; l'URL doit être unique et la date est obligatoire pour programmer.
- Paiement : accepté ou refusé.

## Données et définitions

Les exemples embarqués sont fictifs. Les chiffres du tableau de bord ne sont pas connectés aux futures API.

- Les statistiques ne modifient pas les commandes.
- La période et les regroupements de dates utilisent UTC.
- Les ventes TTC sont calculées sur les totaux figés des commandes confirmées du jeu de données.
- Le panier moyen affiché est ventes TTC / nombre de commandes confirmées de la période.
- Retours et remboursements sont présentés séparément des ventes.
- L'alerte de stock apparaît lorsque stock disponible ≤ seuil configuré.
- Le dashboard contient seulement des mesures illustratives dérivées des commandes fictives ; aucun taux de conversion ou trafic réel n'est simulé.

## Design system et responsive

- Identité commune boutique / administration ; navigation et densité adaptées aux usages.
- Thèmes clair et sombre, conservés localement.
- Texte sombre sur fonds vert clair dans le thème sombre, pour maintenir le contraste.
- Navigation desktop en barre horizontale ; navigation mobile/tablette en barre inférieure fixe, avec zone de sécurité iOS. En administration, les rubriques visibles s’adaptent au profil connecté.
- Footer public en quatre zones sur desktop ; sur mobile, identité en pleine largeur, liens boutique/service en deux colonnes, puis informations légales séparées et zone de copyright dédiée. Chaque lien de page suit le slug et l’état de publication configurés dans l’administration.
- Footer d'administration réduit à une ligne de contexte interne.
- Tableaux dans des conteneurs défilables horizontalement ; cartes de commandes et de retour empilées sur petits écrans.
- Focus clavier visible, libellés explicites, états signalés textuellement.

## Interactions simulées et limites

- Authentification, profils et autorisations sont uniquement illustratifs côté navigateur. Ils ne constituent pas une sécurité.
- Les paiements, remboursements, e-mails, relances et expéditions ne sont pas exécutés.
- Les données des commandes et stocks créées/modifiées en session ne sont pas reliées au métier ni au serveur ; seul le panier et certains brouillons de contenu sont conservés dans le stockage local du navigateur.
- Les images produits sont des illustrations CSS ; aucun média réel n'est téléversé.
- Les pages de contenu utilisent un champ texte simple ; éditeur visuel, HTML riche, assainissement serveur, redirections d'URL et menus CMS complets restent à implémenter.
- Les PDF, factures, avoirs et documents juridiquement/fiscalement conformes ne sont pas générés. L'export de document est une page HTML imprimable.
- Le checkout ne réalise aucune transaction. Aucun transporteur, captcha, service d'analyse ou prestataire de paiement n'est branché.

## Arbitrages UX à confirmer avant SpecForge

1. Emplacements définitifs des menus (navigation principale, footer boutique, service client, légal) et éventuels niveaux parent/enfant.
2. Textes légaux réels et politique de publication, dont pages obligatoires et pages non indexables.
3. Règles exactes de retours partiels, délais, réception, décision de remboursement et réintégration de stock (à aligner sur ECOM-11).
4. Documents effectivement émis en v1, disponibilité de facture/avoir et articulation avec les droits d'accès (ECOM-16/17).
5. Matrice de permissions finale et actions permises à chaque rôle (ECOM-12/16).
6. Paramètres de panier abandonné, modèle d'e-mail et déclenchement manuel/automatique (ECOM-12/14/20).
7. Définitions statistiques définitives, notamment période UTC, dénominateur du panier moyen, ventes HT/TTC et traitement des remboursements (ECOM-15).
8. Présentation et états des méthodes de livraison et de paiement réels.

## Fichiers

- `index.html` : point d'entrée du prototype à fichiers séparés.
- `styles.css` : design system et responsive.
- `app.js` : navigation, données fictives et interactions.
- `README.md` : guide de test et limites.
- `NOTE-UX-DECISIONS.md` : points de revue et décisions en attente.
