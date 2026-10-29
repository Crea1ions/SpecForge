# Cartographie du référentiel e-commerce (L1)

**Version :** 0.1 (brouillon)
**Référence :** 20 fiches de `fiches/` (ECOM-01 à ECOM-20), Odoo 19.0 Community
**Statut :** document de renvoi, aucun fait nouveau ; à régénérer quand une fiche change
**Décisions :** voir [ADR-TEMPLATE-ECOMMERCE.md](ADR-TEMPLATE-ECOMMERCE.md) (cadrage et ADR du template e-commerce)

## Rôle

Vue d'ensemble du référentiel : un domaine par ligne, avec son objectif, les modules Odoo cités et les fiches liées. Le détail (données, règles, états, points non vérifiés) reste dans la fiche.

## Domaines

| Fiche | Objectif | Modules Odoo cités (§ Correspondance) | Fiches liées (§ Dépendances) |
|---|---|---|---|
| [ECOM-01 Catalogue et gestion des produits](fiches/ECOM-01-catalogue.md) | Décrire un produit physique simple, de sa création à son archivage, et définir quand il est vendable, publiable et visible. | `delivery`, `loyalty`, `payment`, `product`, `sale`, `stock`, `website`, `website_payment`, `website_sale`, `website_sale_stock` | ECOM-02, ECOM-03, ECOM-05, ECOM-06, ECOM-08, ECOM-09, ECOM-13, ECOM-17 |
| [ECOM-02 Catégories, navigation et recherche](fiches/ECOM-02-categories-navigation.md) | Organiser le catalogue en arbre de catégories, permettre à un visiteur de parcourir et de rechercher les produits visibles. | `product`, `website_sale`, `website_sale_autocomplete` | ECOM-01, ECOM-03, ECOM-05, ECOM-13, ECOM-15 |
| [ECOM-03 Prix et taxes](fiches/ECOM-03-prix-taxes.md) | Définir comment le prix d'un produit est déterminé, avec quelles taxes, et comment il est affiché. | `account`, `product`, `website_sale` | ECOM-01, ECOM-02, ECOM-04, ECOM-05, ECOM-06, ECOM-08 |
| [ECOM-04 Promotions](fiches/ECOM-04-promotions.md) | Définir les réductions et avantages appliqués à une commande. | `loyalty`, `sale_loyalty`, `website_sale_loyalty` | ECOM-03, ECOM-05, ECOM-06, ECOM-07, ECOM-10, ECOM-11, ECOM-14 |
| [ECOM-05 Panier](fiches/ECOM-05-panier.md) | Permettre à un visiteur ou à un client de constituer une sélection de produits, d'en modifier les quantités et de la valider. | `sale`, `website_sale` | ECOM-01, ECOM-03, ECOM-04, ECOM-06, ECOM-07, ECOM-08, ECOM-09, ECOM-10, ECOM-14, ECOM-15 |
| [ECOM-06 Commandes et validation](fiches/ECOM-06-commandes.md) | Définir quand une commande existe, comment elle est validée, annulée et verrouillée, et quelles données elle fige. | `sale`, `website_event_sale`, `website_sale`, `website_sale_collect` | ECOM-03, ECOM-05, ECOM-07, ECOM-08, ECOM-09, ECOM-10, ECOM-11, ECOM-14, ECOM-15, ECOM-17, ECOM-19 |
| [ECOM-07 Paiements et intégration de plusieurs prestataires](fiches/ECOM-07-paiements.md) | Définir comment un paiement est engagé, suivi et finalisé, et le contrat qui permet de brancher plusieurs prestataires sans modifier la boutique. | `payment`, `payment_ecpay`, `payment_payu`, `payment_stripe`, `sale`, `website_sale` | ECOM-03, ECOM-06, ECOM-10, ECOM-11, ECOM-14, ECOM-15, ECOM-17, ECOM-18, ECOM-19 |
| [ECOM-08 Livraison et intégration de plusieurs transporteurs](fiches/ECOM-08-livraison.md) | Définir comment une méthode de livraison est proposée, tarifée et appliquée à une commande, comment l'expédition est suivie, et le contrat qui permet de brancher plusieurs transporteurs. | `delivery`, `delivery_mondialrelay`, `stock`, `stock_delivery`, `website_sale`, `website_sale_collect` | ECOM-01, ECOM-03, ECOM-05, ECOM-06, ECOM-09, ECOM-10, ECOM-11, ECOM-14, ECOM-15, ECOM-17, ECOM-18, ECOM-19 |
| [ECOM-09 Stocks et disponibilité](fiches/ECOM-09-stocks.md) | Définir ce qu'est le stock d'un produit, ce qui est réellement disponible à la vente, quand il est réservé, et comment la boutique réagit à une rupture. | `sale_stock`, `stock`, `website_sale_stock` | ECOM-01, ECOM-05, ECOM-06, ECOM-08, ECOM-11, ECOM-13, ECOM-14, ECOM-15, ECOM-18, ECOM-19 |
| [ECOM-10 Comptes clients](fiches/ECOM-10-comptes-clients.md) | Permettre à un visiteur d'acheter avec ou sans compte, et à un client connecté de gérer son identité, ses adresses et l'historique de ses commandes. | `auth_signup`, `mail`, `phone_validation`, `portal`, `sale`, `website_sale`, `website_sale_wishlist` | ECOM-01, ECOM-03, ECOM-05, ECOM-06, ECOM-08, ECOM-11, ECOM-14, ECOM-16, ECOM-19 |
| [ECOM-11 Retours et remboursements](fiches/ECOM-11-retours-remboursements.md) | Définir comment un client rend un produit, comment la boutique le réceptionne et le rembourse, et comment ces trois actions restent indépendantes mais liées. | `account`, `account_payment`, `payment`, `sale_stock`, `stock`, `website_sale` | ECOM-06, ECOM-07, ECOM-08, ECOM-09, ECOM-10, ECOM-14, ECOM-15, ECOM-17, ECOM-19 |
| [ECOM-12 Administration de la boutique](fiches/ECOM-12-administration.md) | Donner à l'équipe de la boutique des écrans et des droits pour suivre les commandes, gérer le catalogue, relancer les paniers abandonnés et administrer les clients. | `sale`, `website_sale` | ECOM-01, ECOM-05, ECOM-06, ECOM-10, ECOM-14, ECOM-15, ECOM-16, ECOM-19 |
| [ECOM-13 Pages et contenu](fiches/ECOM-13-pages-contenu.md) | Permettre à l'équipe de publier des pages de contenu et de structurer la navigation du site. | `google_recaptcha`, `html_builder`, `html_editor`, `website` | ECOM-01, ECOM-12, ECOM-15, ECOM-16, ECOM-18, ECOM-19 |
| [ECOM-14 Notifications](fiches/ECOM-14-notifications.md) | Informer le client et l'équipe des événements de la boutique, avec des messages cohérents et traçables. | `auth_signup`, `mail`, `sale`, `stock`, `website_sale` | ECOM-06, ECOM-07, ECOM-08, ECOM-10, ECOM-11, ECOM-12, ECOM-17, ECOM-18, ECOM-19 |
| [ECOM-15 Statistiques](fiches/ECOM-15-statistiques.md) | Donner à l'équipe une vue chiffrée de l'activité de la boutique : ventes, paniers abandonnés, produits, origine des commandes. | `digest`, `sale`, `website`, `website_sale` | ECOM-01, ECOM-03, ECOM-06, ECOM-10, ECOM-12, ECOM-13, ECOM-14, ECOM-16, ECOM-18 |
| [ECOM-16 Sécurité et permissions](fiches/ECOM-16-securite-permissions.md) | Définir qui peut voir et faire quoi, et comment les accès sans compte sont protégés. | `auth_passkey`, `auth_password_policy`, `auth_signup`, `auth_timeout`, `auth_totp`, `base`, `google_recaptcha`, `portal`, `sale`, `website`, `website_sale` | ECOM-10, ECOM-12, ECOM-13, ECOM-19, ECOM-20 |
| [ECOM-17 Documents](fiches/ECOM-17-documents.md) | Produire et rendre accessibles les documents commerciaux et logistiques d'une commande. | `account`, `sale`, `stock` | ECOM-03, ECOM-06, ECOM-08, ECOM-10, ECOM-11, ECOM-14, ECOM-16 |
| [ECOM-18 Intégrations externes](fiches/ECOM-18-integrations-externes.md) | Définir comment la boutique s'appuie sur des services externes sans en dépendre au socle. | `auth_oauth`, `delivery_mondialrelay`, `google_recaptcha`, `sale_gelato`, `sale_gelato_stock`, `website_sale_gelato`, `website_sale_mondialrelay` | ECOM-06, ECOM-08, ECOM-10, ECOM-11, ECOM-14, ECOM-16, ECOM-19 |
| [ECOM-19 Journalisation](fiches/ECOM-19-journalisation.md) | Garder une trace fiable de ce qui s'est passé sur une commande, un compte et une intégration, sans exposer de données personnelles. | `base`, `mail`, `sale` | ECOM-06, ECOM-10, ECOM-11, ECOM-14, ECOM-16, ECOM-18, ECOM-20 |
| [ECOM-20 Exploitation technique](fiches/ECOM-20-exploitation-technique.md) | Définir ce qui tourne en arrière-plan et ce qui se règle côté serveur, pour que la boutique fonctionne sans intervention. | `auth_signup`, `auth_timeout`, `payment`, `sale`, `website_sale` | ECOM-07, ECOM-10, ECOM-12, ECOM-14, ECOM-16, ECOM-17, ECOM-19 |

## Lecture des colonnes

- **Objectif** : première phrase de la section « Objectif et périmètre » de la fiche.
- **Modules Odoo cités** : éléments entre backticks de la section « Correspondance Odoo » dont le premier segment est un dossier de module du dépôt Odoo lu. Liste de modules cités, non exhaustive : elle n'indique ni qu'un module a été lu en entier, ni sa licence (voir L7).
- **Fiches liées** : numéros ECOM-xx trouvés dans la section « Dépendances » de la fiche, tels que déclarés, sans le sens amont ou aval (voir L4). Les listes abrégées (« ECOM-02, 03 ») sont développées.

## Limites

- Les numéros de section varient d'une fiche à l'autre ; l'extraction se fait par le titre des sections.
- Un lien déclaré dans une fiche n'est pas toujours repris dans l'autre fiche : la colonne reflète chaque fiche, pas un graphe symétrique.
- Les modules sont repérés par texte : un module cité hors de la section « Correspondance Odoo » n'est pas relevé, et un mot courant entre backticks identique à un nom de module peut l'être à tort.
- Les écarts de cohérence entre fiches sont traités dans la relecture prévue avant L6, pas ici.
