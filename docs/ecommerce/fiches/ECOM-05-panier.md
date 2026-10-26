# ECOM-05 — Panier

**Version :** 0.2 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `website_sale`, `sale`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Panier et commande sont deux objets distincts ; la commande est créée à la validation du panier (ECOM-06) | Oui : Odoo utilise un seul `sale.order` (brouillon = panier, puis `action_confirm`) |
| D2 | Prix et taxes du panier sont recalculés à chaque modification, et figés à la création de la commande | Partiel : Odoo recalcule (`_recompute_cart`) ; le gel est à vérifier (ECOM-06, ECOM-03 D5) |
| D3 | Une ligne par produit : ajouter un produit déjà présent cumule la quantité | Partiel : `_cart_add` met à jour la ligne existante si produit, unité, ligne parente et absence d'attribut personnalisé ou de combo correspondent (`_cart_find_product_line`) ; les produits à attributs personnalisés ne sont pas cumulés (option avancée) |
| D4 | À la connexion, le panier anonyme est rattaché au compte (pas de fusion ligne à ligne) ; sans panier en session, le panier ouvert précédent du client sur cette boutique est retrouvé, puis ses prix et son adresse sont recalculés | Non : `_get_and_cache_current_cart` (recherche : client, boutique, brouillon, `limit=1` sans tri explicite) |
| D5 | Un panier dont le paiement est engagé (transaction en attente, autorisée ou réussie) n'est plus le panier courant | Non : conditions de `_get_and_cache_current_cart` |
| D6 | Les frais de livraison sont recalculés à chaque modification du panier ; leur représentation (ligne ou champ) est décidée en ECOM-08 | Odoo : ligne de commande `is_delivery` |

## 1. Objectif et périmètre

Permettre à un visiteur ou à un client de constituer une sélection de produits, d'en modifier les quantités et de la valider.
Les prix et taxes viennent d'ECOM-03, le stock d'ECOM-09, la livraison d'ECOM-08, le paiement d'ECOM-07. Les remises par coupon relèvent d'ECOM-04.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Panier | Sélection ouverte d'un client, rattachée à une boutique | Socle |
| Ligne de panier | Produit, quantité, prix unitaire | Socle |
| Client du panier | Compte, ou visiteur anonyme identifié par sa session | Socle |
| Avertissement | Message sur une quantité ajustée ou un produit retiré | Socle |
| Panier abandonné | Panier ouvert inactif d'un client identifié | Standard complémentaire |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Boutique | `website_id` | Socle | Mono-boutique en socle |
| Client | `partner_id` | Socle | Visiteur anonyme = partenaire du compte public |
| Lignes | `order_line`, `website_order_line` | Socle | La seconde est filtrée par `_show_in_cart()`, contenu non lu |
| Quantité de ligne | `product_uom_qty` | Socle | Supprimée si ≤ 0 |
| Quantité totale | `cart_quantity` | Dérivé | Somme tronquée en entier |
| Services uniquement | `only_services` | Dérivé | Vrai pour un panier vide (`all()` sur liste vide) |
| Montant de livraison | `amount_delivery` | Dérivé | HT ou TTC selon le réglage boutique |
| Mode de livraison | `carrier_id` | ECOM-08 | |
| Avertissement | `shop_warning` | Socle | Lu puis effacé (`_get_shop_warning(clear=True)`) |
| Panier courant | clé de session `CART_SESSION_CACHE_KEY` | Socle | |
| Liste de prix, position fiscale | `pricelist_id`, `fiscal_position_id` | Standard complémentaire | ECOM-03 |
| Abandonné | `is_abandoned_cart`, `cart_recovery_email_sent` | Standard complémentaire | |
| Délai d'abandon | `website.cart_abandoned_delay` | Standard complémentaire | Défaut 10.0, en heures ; repli à 1.0 si le champ vaut 0 |
| Prix nul interdit | `website.prevent_zero_price_sale` | Standard complémentaire | Valeur par défaut non lue |

## 4. États et cycle de vie

- **Ouvert** : brouillon, modifiable. Odoo vérifie `state == 'draft'` pour accepter un panier comme courant.
- **Paiement engagé** : une transaction est en attente, autorisée ou réussie. Le panier n'est plus le panier courant (D5).
- **Validé** : le panier donne naissance à une commande (ECOM-06).
- **Abandonné** (dérivé, non stocké) : ouvert, client identifié, au moins une ligne, plus ancien que le délai d'abandon. Un visiteur anonyme n'est jamais « abandonné ».
- **Réinitialisé** : panier introuvable, d'une autre boutique, ou plus en brouillon ; un nouveau panier est créé au prochain ajout.

## 5. Invariants et règles de validation

1. Un panier appartient à une boutique et à un client (compte, ou visiteur anonyme identifié par sa session).
2. Une session n'a qu'un seul panier courant.
3. Un panier est courant s'il est ouvert, de la bonne boutique et sans paiement engagé (D5) ; sinon un nouveau panier est créé.
4. Une ligne par produit simple ; ajouter cumule la quantité (D3).
5. Une quantité ≤ 0 supprime la ligne (Odoo : `_cart_update_order_line`).
6. Toute quantité ajoutée passe par un point de contrôle qui peut l'ajuster et renvoyer un avertissement (Odoo : `_verify_updated_quantity`, sans limite par défaut). `website_sale_stock` le surcharge : pour un produit suivi en stock dont la vente hors stock est interdite, la quantité totale au panier est plafonnée au stock libre arrondi à l'entier inférieur, avec avertissement (voir ECOM-09).
7. Seul un produit achetable est ajoutable (ECOM-01 §4). Un produit devenu inactif est retiré du panier à la vérification (Odoo : `_verify_cart` ; le cas non vendable ou non publié n'a pas été lu).
8. Prix et taxes sont recalculés à chaque modification (D2).
9. Après chaque modification, la livraison est recalculée si un mode est choisi ; elle est retirée si le tarif échoue ou si le panier ne contient que des services (Odoo : `_verify_cart_after_update`).
10. Un panier est payable s'il a au moins une ligne, aucune ligne à prix nul quand ce n'est pas autorisé, et, hors services, un mode de livraison choisi et compatible avec l'adresse (Odoo : `_check_cart_is_ready_to_be_paid`).
11. À la connexion, le panier prend l'identité du client (D4) ; les prix sont recalculés.
12. Le panier ne mélange pas deux boutiques ni deux sociétés (Odoo : `create` refuse une société différente de celle de la boutique).

## 6. Erreurs et cas particuliers

- Panier introuvable (supprimé) : réinitialisation silencieuse (Odoo : `MissingError`, `sale_reset`). `sale_reset` ne supprime aucune commande : il efface les clés de session (panier, quantité, liste de prix, position fiscale).
- Quantité réduite par le point de contrôle : un avertissement est affiché une fois, puis effacé.
- Ligne à prix nul quand c'est interdit : refus du paiement.
- Mode de livraison absent ou incompatible avec l'adresse : refus avec message.
- Remise de liste de prix visible en boutique mais absente du panier (Odoo) : voir ECOM-03 §6, risque d'écart de prix perçu.
- Quantité totale : Odoo tronque à l'entier ; ne pas reprendre pour des quantités fractionnaires.
- Panier vide : `only_services` vrai dans Odoo, sans effet au paiement car `_is_cart_ready` exige une ligne.
- Unité de mesure non disponible pour le produit : refus (multi-unités, option avancée).

## 7. Frontières

- **Panier ≠ commande :** le panier est modifiable et sans engagement ; la commande est un engagement (D1, ECOM-06).
- **Panier ≠ paiement :** le paiement engagé fige le panier (D5) ; la transaction relève d'ECOM-07.
- **Panier ≠ livraison :** le tarif est calculé par le transporteur (Odoo : `carrier_id.rate_shipment`), voir ECOM-08.
- **Panier ≠ stock :** Odoo contrôle la quantité à l'ajout et à la modification (`website_sale_stock`), sans réservation visible dans ce code. Un stock qui baisse après l'ajout n'est pas détecté par ce contrôle ; une vérification ultérieure (paiement, confirmation) reste à chercher en ECOM-06 et ECOM-09.
- **Externalisable :** relance des paniers abandonnés (ECOM-14, ECOM-18) ; suivi analytique (`_get_tracking_information`, ECOM-15).
- **Permissions :** Odoo crée le panier avec les droits superutilisateur et la route `/shop/cart` accepte un `access_token` (usage non lu). Le visiteur ne doit accéder qu'à son propre panier (ECOM-16).

## 8. Dépendances

- Entrantes : ECOM-01 (produit achetable), ECOM-03 (prix, taxes), ECOM-09 (quantité disponible), ECOM-08 (mode de livraison), ECOM-10 (compte client).
- Sortantes : ECOM-04 (remises), ECOM-06 (commande), ECOM-07 (paiement), ECOM-14 (relance), ECOM-15 (statistiques).

## 9. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Création du panier | `website_sale` | `website._create_cart`, `_prepare_sale_order_values` |
| Panier courant | `website_sale` | `website._get_and_cache_current_cart`, `sale_reset` |
| Ajout, mise à jour | `website_sale` | `_cart_add`, `_cart_update_order_line`, `_verify_updated_quantity` |
| Vérifications | `website_sale` | `_verify_cart_after_update`, `_verify_cart`, `_recompute_cart` |
| Prêt à payer | `website_sale` | `_is_cart_ready`, `_check_cart_is_ready_to_be_paid`, `_get_zero_priced_lines` |
| Abandon | `website_sale` | `is_abandoned_cart`, `action_recovery_email_send` |
| Routes | `website_sale` | `controllers/cart.py` : `/shop/cart`, `add_to_cart`, `quick_add`, `update_cart`, `cart_quantity`, `clear_cart` |
| Confirmation | `sale` | `action_confirm` (surchargé dans `website_sale`) |

Licences : `website_sale` et `sale` sont en LGPL-3 (vérifié).

## 10. Classement (T6)

- **Socle :** panier courant par session, ajout, modification, suppression, cumul de quantité, avertissements, recalcul des prix, vérification avant paiement, gel pendant le paiement, rattachement au compte à la connexion.
- **Standard complémentaire :** panier retrouvé après reconnexion, fusion des lignes, relance des paniers abandonnés, interdiction du prix nul, ajout rapide, produits accessoires (`_cart_accessories`), rachat d'une commande passée (`reorder`).
- **Option avancée :** combos, multi-unités de mesure, multi-société et multi-boutique, paiement express.

## 11. Points non vérifiés

- Tri par défaut de `sale.order` (quel brouillon est repris quand il y en a plusieurs).
- `_cart_update_line_quantity`, suite de `_verify_cart` après la ligne 698, fin de `_verify_updated_quantity` (lignes 44-68), `_get_cart_qty`, `_get_free_qty`.
- `_show_in_cart`, `clear_cart`, usage de `access_token` et de `revive_method`.
- Mise à jour de `date_order` à chaque modification (notion de dernière activité).
- Valeur par défaut de `prevent_zero_price_sale`.
- Gel du prix à la confirmation (ECOM-06).
