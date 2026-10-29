# ECOM-09 — Stocks et disponibilité

**Version :** 0.2 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `stock`, `sale_stock`, `website_sale_stock`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Quatre quantités distinctes par produit : en stock (physique), réservée, disponible (en stock − réservée), prévisionnelle (disponible + entrant − sortant) | Non : `qty_available`, `reserved_quantity` (quant), `free_qty`, `virtual_available` ; la formule du prévisionnel n'est pas lue |
| D2 | Le suivi de stock est activé produit par produit ; un produit non suivi est toujours disponible | Non : `is_storable` (défaut `False`) ; seuls les biens peuvent être suivis (`compute_is_storable` remet `is_storable` à `False` si le type n'est pas `consu`) |
| D3 | La disponibilité affichée et contrôlée est la quantité disponible, jamais le prévisionnel | Non : `free_qty` |
| D4 | Le panier ne réserve rien : il plafonne la quantité à l'ajout ; la réservation a lieu à la confirmation de la commande | Non : `_verify_updated_quantity`, `_action_launch_stock_rule` |
| D5 | La disponibilité est recontrôlée quand le paiement est engagé *(proposition)* | Oui : aucun contrôle de stock trouvé avant ni pendant la confirmation |
| D6 | Quand le suivi est activé, la vente hors stock est interdite par défaut *(proposition)* | Oui : `allow_out_of_stock_order` vaut `True` par défaut, donc cocher le suivi ne limite rien |
| D7 | Socle : un seul entrepôt ; plusieurs entrepôts en option avancée | Oui : Odoo prend tous les entrepôts si le site n'en désigne pas |
| D8 | Chaque variation de stock est un mouvement tracé *(proposition)* | Non lu : `stock.move` |
| D9 | Annuler une commande libère sa réservation *(déduit)* | `sale_stock._action_cancel` annule les expéditions non terminées ; la libération n'est pas lue |

## 1. Objectif et périmètre

Définir ce qu'est le stock d'un produit, ce qui est réellement disponible à la vente, quand il est réservé, et comment la boutique réagit à une rupture.
Le produit est en ECOM-01, le panier en ECOM-05, la commande en ECOM-06, l'expédition en ECOM-08. Le réapprovisionnement et les achats sont hors périmètre.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Stock d'un produit | Quantités en stock, réservée et disponible | Socle |
| Politique de rupture | Vente autorisée ou non hors stock, message | Socle |
| Réservation | Quantité d'une commande mise de côté | Socle |
| Mouvement de stock | Variation tracée (entrée, sortie, ajustement) | Socle |
| Entrepôt | Lieu de stockage | Option avancée |
| Emplacement, lot, numéro de série, colis | Détail du stock | Option avancée |
| Inventaire (comptage) | Correction des quantités | Standard complémentaire |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Suivi de stock | `is_storable` (« Track Inventory », calculé, stocké, modifiable, défaut `False`) | Socle | D2 |
| Quantité en stock | `qty_available` | Dérivé | Somme des quants |
| Quantité disponible | `free_qty` | Dérivé | En stock − réservée − expirée non réservée (`_compute_quantities_dict`) ; arrondie à l'unité du produit |
| Quantité prévisionnelle | `virtual_available`, `incoming_qty`, `outgoing_qty` | Option avancée | D1 |
| Quant | `stock.quant` : `product_id`, `location_id`, `lot_id`, `package_id`, `owner_id`, `quantity`, `reserved_quantity`, `available_quantity` | Socle / avancé | Une ligne par combinaison emplacement, lot, colis, propriétaire |
| Inventaire | `inventory_quantity`, `inventory_diff_quantity`, `inventory_date`, `last_count_date` | Standard complémentaire | |
| Vente hors stock | `allow_out_of_stock_order` (défaut `True`) | Socle | D6 ; défini dans `website_sale_stock` |
| Seuil d'affichage | `available_threshold` (défaut 5.0), `show_availability` (défaut `False`) | Standard complémentaire | Valeurs par défaut globales dans les réglages (`default_available_threshold`, `default_show_availability`), surchargées par le produit ; la quantité restante s'affiche « seulement en dessous du seuil » (libellé du réglage) ; logique d'affichage non lue |
| Message de rupture | `out_of_stock_message` | Standard complémentaire | ECOM-13 |
| Entrepôt de la boutique | contexte `warehouse_id` (`_get_shop_warehouse_id`) | Option avancée | Vide = tous les entrepôts |
| Quantité au panier | `_get_cart_qty` | Dérivé | Somme des lignes du produit, dans l'unité du produit |

## 4. États et événements

Le stock n'a pas de cycle de vie propre : il évolue par événements.

| Événement | Effet sur le stock |
|---|---|
| Ajout au panier | Aucun : contrôle de plafond seulement (D4) |
| Confirmation de la commande | Réservation des quantités non encore traitées (Odoo : procurement, `stock.rule.run`, confirmation des expéditions) |
| Quantité augmentée après confirmation | Réservation de la différence avec la quantité déjà traitée (Odoo : `_get_qty_procurement` = mouvements sortants − mouvements entrants, hors mouvements vers l'inventaire ; un retour réduit donc la quantité traitée, voir ECOM-11) |
| Expédition validée | Sortie du stock physique (déduit, ECOM-08) |
| Annulation de la commande | Libération de la réservation (D9) |
| Retour reçu | Entrée en stock (ECOM-11) |
| Inventaire | Ajustement par mouvement tracé (D8) |

Statut dérivé « épuisé » : suivi activé, vente hors stock interdite, quantité disponible ≤ 0 (ECOM-01 §4).

## 5. Invariants et règles de validation

1. Disponible = en stock − réservé (Odoo : `free_qty` retranche aussi le stock expiré non réservé, option péremption).
2. Les quantités sont arrondies selon l'unité du produit ; la quantité disponible affichée est arrondie à l'entier inférieur (Odoo : `float_round`, `DOWN`).
3. Un produit non suivi n'est jamais épuisé (ECOM-01 §4).
4. Suivi activé et vente hors stock interdite : la quantité totale du produit dans le panier ne dépasse pas la quantité disponible ; l'ajout est plafonné avec un avertissement (ECOM-05 §5.6).
5. Un produit à variantes est épuisé si toutes ses variantes le sont (ECOM-01).
6. La réservation a lieu à la confirmation de la commande, pour les lignes de type bien et les commandes non verrouillées ; seule la différence avec ce qui est déjà traité est réservée (Odoo : `_action_launch_stock_rule`).
7. Le panier ne réserve pas de stock (D4).
8. La disponibilité est recontrôlée quand le paiement est engagé (D5, proposition).
9. *(Proposition, non lu)* Le stock disponible ne devient pas négatif sans autorisation explicite.
10. *(Proposition, non lu)* Une réservation ne dépasse pas le stock physique.
11. Toute variation de stock a un mouvement tracé avec sa cause (D8, ECOM-19).
12. Une commande annulée libère sa réservation (D9).
13. *(Déduit)* Un retour reçu diminue la quantité déjà traitée de la ligne (Odoo : `_get_qty_procurement`) ; il ne doit pas déclencher une nouvelle réservation (ECOM-11).

## 6. Erreurs et cas particuliers

- Stock insuffisant à la confirmation : Odoo ne refuse pas ; l'expédition reste en attente (déduit : état `confirmed` au lieu de `assigned`). Avec D5 et D6, le cas est détecté avant le paiement.
- Approvisionnement impossible (aucune route ou règle) : `stock.rule.run` lève une `ProcurementException` (docstring : regroupe les approvisionnements en défaut). Effet sur une commande déjà payée non lu : risque de commande payée mais non confirmée, à tester.
- Stock baissé entre l'ajout au panier et le paiement : non détecté par le contrôle du panier (ECOM-05 §7).
- Même produit dans deux paniers : chacun voit le stock complet, car le panier ne réserve pas ; le premier à payer l'emporte.
- Produit épuisé : bouton d'ajout désactivé et message de rupture ; l'ajout rapide est masqué (Odoo : `_website_show_quick_add`).
- Paiement réussi sans stock disponible : commande confirmée, expédition en attente ; à traiter avec ECOM-11 si l'annulation est nécessaire.
- Retrait en magasin : l'entrepôt choisi change le stock considéré au checkout (Odoo : `website_sale_collect`, `cart._get_free_qty`) ; non lu.
- Produit passé de suivi à non suivi : comportement non lu (`compute_is_storable`).
- Unité de mesure différente : quantités converties dans l'unité du produit (Odoo : `_verify_updated_quantity`).

## 7. Disponibilité affichée et stock externe

**Affichage (Odoo, `website_sale_stock`) :**
- `_get_product_available_qty` : à utiliser seulement avant le checkout ; aux étapes de checkout, `cart._get_free_qty` tient compte de l'entrepôt choisi.
- Les trois réglages d'affichage (`show_availability`, `available_threshold`, `out_of_stock_message`) sont portés par le produit mais relèvent de la disponibilité (ECOM-01 §7).

**Stock externe *(proposition, non lu dans Odoo)* :** la gestion du stock peut être confiée à un système externe (WMS, ERP). Le contrat minimal serait : interroger la disponibilité d'un SKU, réserver une quantité pour une commande, libérer, confirmer la sortie, et recevoir les variations. Il suit la logique des contrats de prestataires (ECOM-07 §7, ECOM-08 §7) et relève d'ECOM-18.

## 8. Frontières

- **Stock physique ≠ stock disponible ≠ prévisionnel** (D1) : le physique est ce qui est en entrepôt ; le disponible retranche les réservations ; le prévisionnel ajoute l'entrant et retranche le sortant.
- **Produit ≠ stock :** le produit déclare s'il est suivi ; les quantités vivent ici (ECOM-01 §7).
- **Disponibilité ≠ stock :** la politique de rupture (vente hors stock, seuil, message) est une règle de vente, pas une quantité.
- **Panier ≠ réservation :** le panier plafonne, la commande réserve (D4).
- **Commande ≠ expédition ≠ mouvement :** la commande déclenche la réservation, l'expédition (ECOM-08) la consomme, le mouvement la trace.
- **Externalisable :** stock tenu par un système externe (§7, ECOM-18).
- **Hors périmètre :** réapprovisionnement, achats, fabrication, valorisation du stock.

## 9. Dépendances

- Entrantes : ECOM-01 (suivi, politique de rupture), ECOM-06 (confirmation, annulation), ECOM-08 (validation d'expédition), ECOM-11 (retours en stock).
- Sortantes : ECOM-05 (plafond au panier), ECOM-01 (épuisé), ECOM-13 (message de rupture), ECOM-14 (alertes), ECOM-15 (statistiques de stock), ECOM-18, ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Suivi de stock | `stock` | `is_storable`, `compute_is_storable` |
| Quantités par produit | `stock` | `qty_available`, `free_qty`, `virtual_available`, `_compute_quantities`, `_compute_quantities_dict` |
| Stock détaillé | `stock` | `stock.quant` |
| Réservation à la confirmation | `sale_stock` | `_action_confirm`, `_action_launch_stock_rule`, `stock.rule.run` |
| Annulation | `sale_stock` | `_action_cancel` (annule les expéditions non terminées) |
| Disponibilité boutique | `website_sale_stock` | `_is_sold_out`, `_get_max_quantity`, `_get_product_available_qty`, `_get_free_qty`, `_get_cart_qty` |
| Plafond au panier | `website_sale_stock` | `_verify_updated_quantity` |
| Politique de rupture | `website_sale_stock` | `allow_out_of_stock_order`, `available_threshold`, `show_availability`, `out_of_stock_message` |

Licences : `stock`, `sale_stock` et `website_sale_stock` en LGPL-3 (vérifié).

## 11. Classement (T6)

- **Socle :** suivi par produit, quantité disponible, plafond au panier, statut épuisé, politique de rupture, réservation à la confirmation, libération à l'annulation, un entrepôt, mouvements tracés.
- **Standard complémentaire :** recontrôle au paiement (D5), seuil et message de rupture, inventaire par comptage, alertes de stock bas.
- **Option avancée :** plusieurs entrepôts, lots et numéros de série, emplacements, colis, prévisionnel, péremption, stock externe, retrait en magasin.

## 12. Points non vérifiés

- Effet d'une `ProcurementException` sur la confirmation d'une commande déjà payée ; réservation effective des mouvements ; stock manquant : comportement déduit, non lu.
- Logique front de `available_threshold` et `show_availability` ; fin de `_get_outgoing_incoming_moves` (mouvements annulés).
- Libération de la réservation à l'annulation, livraisons partielles et reliquats.
- Formule du prévisionnel, `stock.warehouse`, désignation d'un entrepôt par le site.
- Contrôle de stock négatif, plafond de réservation.
