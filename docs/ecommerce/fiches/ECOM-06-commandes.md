# ECOM-06 — Commandes et validation

**Version :** 0.3 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `sale`, `website_sale`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | La commande naît quand un paiement est engagé (en attente, autorisé ou réussi) ; avant, c'est un panier modifiable (ECOM-05) | Partiel : Odoo n'a qu'un objet `sale.order` ; le lancement du paiement crée une transaction en brouillon sans changer l'état. Au retour du prestataire, la route de statut vide la session (`sale_reset`) ; le comportement pendant la redirection n'est pas lu |
| D2 | Échec ou annulation de paiement : le panier reste modifiable, aucune commande n'est créée | Non : déduit, aucune branche sur la commande dans `_post_process` |
| D3 | Paiement différé (virement) : commande « en attente de paiement » jusqu'à la validation du paiement | Non : transaction `pending`, commande `sent` |
| D4 | Confirmation quand le paiement est autorisé ou réussi ET que le montant requis est atteint ; une commande par paiement, pas de paiement groupé | Non : `_check_amount_and_confirm_order` ; confirmé si `_get_prepayment_required_amount() <= amount_paid` ; requis = 0 sans `require_payment`, sinon `amount_total × prepayment_percent` ; `amount_paid` = somme des transactions `authorized` ou `done` |
| D5 | Prix, taxes et frais de la commande sont figés à sa création : aucun recalcul ensuite (résout ECOM-03 D5) | Oui : Odoo n'a pas de gel explicite, le prix est stocké sur la ligne et recalculé seulement si produit, unité ou quantité changent |
| D6 | Statuts séparés : commande, paiement (ECOM-07), expédition (ECOM-08), remboursement (ECOM-11) | Partiel : `sale.order.state` n'a que 4 valeurs ; les autres statuts d'Odoo ne sont pas lus |
| D7 | Verrouillage d'une commande confirmée : option avancée | Non : `locked`, booléen, réglage `sale.group_auto_done_setting` |
| D8 | Une commande de montant nul est confirmée sans paiement, si le panier est prêt | Non : route de statut de paiement (`_validate_order`, non lu) |

## 1. Objectif et périmètre

Définir quand une commande existe, comment elle est validée, annulée et verrouillée, et quelles données elle fige.
Le panier est en ECOM-05, le paiement en ECOM-07, l'expédition en ECOM-08, les retours en ECOM-11, les documents en ECOM-17.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Commande | Engagement du client : lignes, adresses, totaux, statut | Socle |
| Ligne de commande | Produit, quantité, prix unitaire figé, taxes | Socle |
| Adresses | Facturation et livraison | Socle |
| Référence de commande | Numéro lisible par le client | Socle |
| Verrouillage | Interdit les modifications après confirmation | Option avancée |
| Commande reprise (rachat) | Recréer un panier depuis une commande passée | Standard complémentaire |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Statut | `state` (`draft`, `sent`, `sale`, `cancel`) | Socle | Voir §4 |
| Date de commande | `date_order` | Socle | Réécrite à la confirmation |
| Client, facturation, livraison | `partner_id`, `partner_invoice_id`, `partner_shipping_id` | Socle | |
| Devise | `currency_id` | Socle | Une seule en socle (ECOM-03) |
| Lignes | `order_line` | Socle | |
| Prix unitaire de ligne | `price_unit`, `technical_price_unit` | Socle | `technical_price_unit` détecte un prix modifié à la main |
| Quantité de ligne | `product_uom_qty` | Socle | |
| Quantités facturée, livrée | `qty_invoiced`, `qty_delivered` | Dérivé | Relèvent d'ECOM-17 et ECOM-08 |
| Ligne de livraison | `is_delivery` | ECOM-08 | |
| Transactions de paiement | `transaction_ids` | ECOM-07 | |
| Factures | `invoice_ids` | ECOM-17 | |
| Verrou | `locked` | Option avancée | D7 |
| Référence | `reference` | Socle | Posée pour un paiement `custom` ; mécanisme de numérotation non lu |

## 4. États et transitions

| État SpecForge | État Odoo | Description |
|---|---|---|
| Panier | `draft`, sans paiement engagé | Modifiable (ECOM-05) |
| En attente de paiement | `sent` | Paiement engagé non finalisé (D3) |
| Confirmée | `sale` | Paiement autorisé ou réussi, montant requis atteint |
| Annulée | `cancel` | Annulation volontaire |

| Transition | Condition (Odoo) |
|---|---|
| Panier → En attente | Transaction `pending` (`action_quotation_sent`) |
| Panier ou En attente → Confirmée | Transaction `authorized` ou `done`, une seule commande liée, montant atteint |
| Confirmée → Annulée | Commande non verrouillée ; les factures en brouillon sont annulées |
| Annulée → autre état | Aucune transition lue |

Remarques :
- Le verrouillage est un booléen indépendant du statut, pas un état.
- Odoo n'a pas d'état « terminée » dans `sale.order.state`.
- L'annulation depuis En attente ou Panier : `action_cancel` ne teste que le verrou. `sale_stock` annule les livraisons non terminées ; une livraison terminée n'est pas annulée (voir ECOM-08, ECOM-11). La surcharge de `payment` n'est pas lue.
- Seul un panier en `draft` est valide pour le checkout : une commande `sent` n'y revient pas (Odoo : `_check_cart`).

## 5. Invariants et règles de validation

1. Une commande est confirmée seulement depuis « En attente de paiement » ou depuis un panier avec paiement engagé (Odoo : `_confirmation_error_message` refuse tout état hors `draft`/`sent`).
2. Toute ligne a un produit (Odoo : refus, hors ligne d'affichage ou d'acompte).
3. La confirmation écrit la date de commande à l'instant de la confirmation (Odoo : `_prepare_confirmation_values`).
4. Un paiement ne confirme que sa propre commande ; paiement groupé interdit (Odoo : une commande par transaction).
5. La confirmation par paiement exige que le montant payé atteigne le montant requis. Socle : paiement intégral. Une autorisation non capturée compte comme payée (Odoo : `amount_paid`). Effet des remboursements sur ce montant non lu.
6. Retraiter un même paiement ne reconfirme pas la commande (Odoo : seuls `draft` et `sent` sont confirmables).
7. Un second paiement simultané sur la même commande est refusé (ECOM-05 §7).
8. Les prix, taxes et frais sont figés à la création de la commande (D5).
9. Une commande verrouillée ne peut pas être annulée ni modifiée (Odoo : `action_cancel`, `product_updatable`).
10. Annuler une commande annule ses factures en brouillon (Odoo : `_action_cancel`).
11. Les transitions d'état et leurs causes sont tracées (ECOM-19).
12. Une commande de montant nul est confirmée sans paiement (D8).

## 6. Erreurs et cas particuliers

- Paiement réussi sur une commande annulée : déduit d'Odoo, la commande n'est pas confirmée mais le mail de paiement part. À traiter explicitement (rapprochement ou remboursement, ECOM-07 et ECOM-11).
- Paiement partiel sous le montant requis : pas de confirmation.
- Transaction sans commande ou avec plusieurs commandes : pas de confirmation.
- Paiement échoué ou annulé : le panier reste utilisable (D2, déduit).
- Produit devenu indisponible entre l'ajout et le paiement : aucun contrôle de stock trouvé avant la confirmation. La confirmation lance les règles de stock (`sale_stock._action_confirm` : `_action_launch_stock_rule`), donc la réservation se fait à la confirmation, pas au panier ; le cas de stock insuffisant n'est pas lu (ECOM-09).
- Prix modifié à la main par un administrateur : protégé contre le recalcul (`technical_price_unit`).
- Confirmation avec tarif de livraison en échec : voir ECOM-08.

## 7. Parcours de validation (checkout)

Étapes d'Odoo (`shop_checkout`) : contrôle du panier et des adresses, choix du mode de livraison (préféré proposé, tarif recalculé), paiement, page de confirmation (`/shop/confirmation`).
- **Socle :** adresses, mode de livraison, paiement, page de confirmation.
- **Étapes configurables :** dans Odoo, ce sont des enregistrements (`website.checkout.step` : `step_href`, étape suivante et précédente, domaine d'étapes autorisées) ; l'adresse est rattachée à l'étape de livraison. Socle : ordre fixe ; étapes configurables en option avancée.
- **Achat sans compte :** dépend d'un réglage (Odoo : `_check_cart` exige un utilisateur connecté, ou des commandes publiques autorisées ; nom du réglage non lu). Standard complémentaire.
- **Retour de paiement :** la route de statut lève la première erreur de paiement si la commande n'est pas confirmée (`_get_shop_payment_errors` : seule erreur lue = produits livrables sans mode de livraison disponible ; aucun contrôle de stock), redirige vers la boutique si le montant est non nul sans transaction, confirme directement une commande de montant nul (D8), vide la session (`sale_reset`), puis redirige vers `/shop/confirmation`. Cette page lit la commande par `sale_last_order_id` en session, sans jeton (ECOM-16).
- **À étudier :** paiement express (option avancée).

## 8. Frontières

- **Commande ≠ panier :** le panier est modifiable, la commande engage (ECOM-05 D1).
- **Commande ≠ paiement :** la commande réagit aux événements du paiement ; elle ne les calcule pas (ECOM-07).
- **Commande ≠ expédition :** la livraison est un statut distinct (ECOM-08).
- **Commande ≠ facture :** la facture est un document dérivé ; facturation automatique possible à la réussite du paiement (Odoo : `sale.automatic_invoice`, ECOM-17).
- **Extension par les autres domaines :** Odoo laisse `_action_confirm` vide dans `sale` pour y brancher stock, livraison et facturation. À conserver comme principe : la confirmation publie un événement, les domaines réagissent.
- **Permissions :** accès à une commande par jeton ou compte (ECOM-16).

## 9. Dépendances

- Entrantes : ECOM-05 (panier), ECOM-07 (événements de paiement), ECOM-03 (prix figés), ECOM-08 (frais), ECOM-10 (client et adresses).
- Sortantes : ECOM-09 (réservation), ECOM-08 (expédition), ECOM-11 (retours), ECOM-14 (notifications), ECOM-15, ECOM-17 (documents), ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| États | `sale` | `SALE_ORDER_STATE`, `state` |
| Confirmation | `sale` | `action_confirm`, `_confirmation_error_message`, `_prepare_confirmation_values`, `_action_confirm` |
| Verrou, annulation | `sale` | `action_lock`, `action_unlock`, `action_cancel`, `_action_cancel` |
| Paiement → commande | `sale` | `payment_transaction._post_process`, `_check_amount_and_confirm_order` |
| Prix de ligne | `sale` | `_compute_price_unit`, `technical_price_unit` |
| Parcours | `website_sale` | `shop_checkout`, `/shop/confirmation`, `/shop/payment/transaction/<id>` |
| Validation du paiement | `website_sale` | `_validate_transaction_for_order` (surchargé par `website_event_sale` et `website_sale_collect`) |

Licences : `sale` et `website_sale` en LGPL-3 (vérifié). `website_event_sale` et `website_sale_collect` non vérifiés.

## 11. Classement (T6)

- **Socle :** commande avec statuts (panier, en attente, confirmée, annulée), confirmation par paiement, paiement différé, prix figés, référence, adresses, annulation, page de confirmation.
- **Standard complémentaire :** rachat d'une commande, achat sans compte, mail de confirmation, facturation automatique.
- **Option avancée :** verrouillage, prépaiement partiel (Odoo : `require_payment`, `prepayment_percent`), paiement express, commandes multi-boutiques ou multi-sociétés, remboursements partiels automatiques.

## 12. Points non vérifiés

- `_validate_order` (absent de `controllers/main.py`, à localiser), `_post_process` de base (`payment`), effet des transactions enfants sur `amount_paid`.
- Panier pendant la redirection vers le prestataire (avant le retour sur la route de statut) ; effet du `sale_reset` sur un visiteur anonyme dont la transaction reste en brouillon (déduit : panier perdu, car la recherche du brouillon ne vaut que pour un client connecté, ECOM-05 D4).
- Fin de `_check_cart` et `_check_addresses` (redirections), réglage des commandes publiques, `_get_allowed_steps_domain`.
- `_action_launch_stock_rule` si le stock est insuffisant ; fin de `sale_stock._action_cancel` (après la ligne 266) ; commande annulée après livraison terminée.
- Numérotation de la référence de commande, statuts de livraison et de facturation de `sale.order`.
- Recalcul de prix après confirmation (dépendance à `date_order`).
