# Modèle de domaine V2 — Template e-commerce (Rust)

**Statut :** décisions acceptées; contrat V2 du preset `rust-ecommerce`.
**Références :** [MODELE-DOMAINE-V1.md](./MODELE-DOMAINE-V1.md), [ADR-TEMPLATE-ECOMMERCE.md](./ADR-TEMPLATE-ECOMMERCE.md), fiches ECOM-12/13/15/16/17.

## 1. Invariants hérités

- Les montants sont des entiers en unités mineures; les lignes et adresses de commande sont figées.
- Les champs traduits suivent la convention JSONB par locale.
- Les rôles `manager`, `operator`, `editor` sont vérifiés par le serveur.
- Les opérations externes restent des contrats/mocks; aucune intégration réelle n’est requise.

## 2. Pages et navigation (ECOM-13)

- `content_pages` porte titre, slug unique, contenu texte/Markdown, statut, `publish_at` UTC et indicateur `is_indexable`.
- `content_menu_items` porte le libellé, l’emplacement, l’ordre, l’élément parent et une cible unique : page ou URL HTTP(S). L’arbre ne peut pas contenir de cycle.
- La visibilité publique exige une page publiée et une date vide ou atteinte. Le rendu échappe le contenu; aucun HTML brut n’est interprété.
- Le gestionnaire et l’éditeur peuvent administrer les pages et menus. La duplication crée un brouillon avec un slug unique et sans duplication des enfants.

## 3. Statistiques (ECOM-15)

- Commande comptée : état `confirmed`, `shipped` ou `delivered` et `placed_at` dans `[start, end)` UTC.
- Commandes = nombre global des commandes comptées; ventes TTC et panier moyen sont agrégés par devise. Le panier moyen utilise une division entière et vaut 0 si le dénominateur est nul. Aucune conversion ni addition inter-devises n’est faite.
- Produits principaux = unités sur lignes de produit, hors lignes de livraison, classées par quantités décroissantes; les montants restent groupés par devise.
- Retours = demandes au statut `closed`, par `closed_at`; remboursements = transactions de type `refund`, statut `done`, par devise et `last_state_change`. Les deux mesures ne sont pas déduites des ventes.
- Alerte stock = quantité disponible inférieure ou égale à `stock_levels.alert_threshold`, défaut 5. Le seuil est configurable par produit.
- Le dashboard est accessible au seul gestionnaire.

## 4. Administration opérationnelle (ECOM-12/16)

- Les listes clients, commandes impayées et paniers abandonnés sont des vues dérivées, non de nouveaux états.
- Un panier abandonné est ouvert, possède un client actif et au moins une ligne, a dépassé le délai `shop.cart_abandon_delay_hours` et n’a pas déjà été placé en file.
- Une relance manuelle réservée au gestionnaire/opérateur ajoute une notification `cart_recovery` en attente et pose atomiquement `recovery_notification_queued`. Aucun courriel n’est envoyé. Le worker automatique réutilise le même indicateur et les mêmes règles.
- Les vues d’administration n’exposent que les données personnelles nécessaires aux opérations.

## 5. Documents opérationnels (ECOM-17)

- PDFs : confirmation/récapitulatif, livraison et justificatif de retour/remboursement.
- Les valeurs proviennent des snapshots de commande, des informations figées d’expédition et des lignes/transactions du retour. Les documents ne sont pas des factures fiscales ou des avoirs.
- Références et noms de fichiers déterministes : type + numéro de commande, ou type + numéro de commande + identifiant de retour.
- Un client ne lit que les documents de ses objets; les téléchargements admin sont autorisés et contrôlés côté serveur. Les documents indisponibles (facture, proforma, avoir) ne sont pas générés.

## 6. Migrations et compatibilité

Les nouvelles tables/colonnes et index sont introduits dans une migration SQLx V2 distincte. Les migrations historiques V1 restent intactes. La nouvelle migration est générée uniquement pour le preset e-commerce; les goldens des autres presets ne changent pas.
