# ECOM-08 — Livraison et intégration de plusieurs transporteurs

**Version :** 0.2 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `delivery`, `stock_delivery`, `delivery_mondialrelay`, `website_sale_collect`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Un transporteur externe est un module interchangeable derrière un contrat explicite (§7) ; le cœur ne connaît aucun transporteur | Oui : contrat implicite, `rate_shipment` appelle `<type>_rate_shipment` si la méthode existe (`hasattr`) |
| D2 | Une méthode de livraison porte son mode de tarification : prix fixe, selon règles, ou transporteur externe | Non : `delivery.carrier`, champ `delivery_type` |
| D3 | Les frais de livraison sont une ligne de commande distincte, taxée selon un produit de livraison ; ils sont figés à la création de la commande (ECOM-06 D5) | Partiel : ligne `is_delivery`, produit de livraison obligatoire ; le gel n'est pas explicite dans Odoo |
| D4 | La réponse de tarification contient succès, prix, devise, message d'erreur et avertissement ; marge, arrondi et gratuité au-delà d'un seuil sont appliqués par le cœur, pas par le transporteur | Partiel : Odoo n'a pas la devise dans la réponse (`TODO` ligne 323) ; marge, arrondi et gratuité sont appliqués par `rate_shipment` après le tarif du transporteur (même principe que SpecForge) |
| D5 | Statut d'expédition distinct du statut de commande | Non : `stock.picking.state` |
| D6 | Une méthode est disponible selon l'adresse, le poids, le volume et les tags produit ; une méthode à règles ne l'est que si son tarif est calculable | Non : `_match`, `_is_available_for_order` |
| D7 | Panier de services seulement : pas de livraison, pas de frais | Non : `only_services` |
| D8 | Socle : méthodes à prix fixe ou à règles, adresse de livraison, lien de suivi. Transporteurs externes, points relais, retrait en magasin : hors socle, seul le contrat est défini | Oui : en Community, les connecteurs externes n'existent pas (Enterprise) |
| D9 | Le transporteur peut notifier le suivi (événement entrant) *(proposition)* | Aucun mécanisme entrant lu |
| D10 | La création d'envoi renvoie succès, référence de suivi, prix réel, devise, étiquettes par colis et message d'erreur ; une méthode non implémentée est une erreur explicite ou une capacité non déclarée | Oui : `send_shipping` renvoie `exact_price` et `tracking_number` ; trois `TODO` (étiquettes par colis, devise, succès/erreur/avertissements) ; `send_shipping`, `get_tracking_link` et `cancel_shipment` renvoient `None` sans erreur si le type ne les implémente pas |

## 1. Objectif et périmètre

Définir comment une méthode de livraison est proposée, tarifée et appliquée à une commande, comment l'expédition est suivie, et le contrat qui permet de brancher plusieurs transporteurs.
Le panier est en ECOM-05, la commande en ECOM-06, le stock en ECOM-09, le retour physique en ECOM-11, les documents en ECOM-17.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Méthode de livraison | Offre au client : nom, zone, limites, tarification | Socle |
| Règle de prix | Prix selon poids, montant, quantité ou zone | Socle |
| Frais de livraison | Ligne de la commande | Socle |
| Expédition | Envoi physique d'une commande, avec statut | Socle |
| Référence de suivi | Numéro et lien fournis par le transporteur | Socle |
| Colis | Regroupement physique avec poids et dimensions | Standard complémentaire |
| Transporteur externe | Service qui tarife et crée les envois | Option avancée |
| Étiquette de retour | Document de retour | Option avancée |
| Point relais, retrait en magasin | Lieu de remise choisi par le client | Option avancée |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Nom, actif, ordre | `delivery.carrier` : `name`, `active`, `sequence` | Socle | |
| Mode de tarification | `delivery_type` (`fixed`, `base_on_rule`, extensible) | Socle | D2 |
| Prix fixe | `fixed_price` (calculé depuis le produit de livraison) | Socle | |
| Règles de prix | `price_rule_ids` | Socle | `delivery.price.rule` : `variable` (défaut `quantity`), `operator`, `max_value`, `list_base_price`, `list_price`, `variable_factor` ; valeurs de `variable` et formule exacte non lues |
| Marges | `margin`, `fixed_margin` | Standard complémentaire | Prix × (1 + `margin`) + marge fixe ; non appliquées au type prix fixe (`_apply_margins`) ; unité de `margin` (fraction ou pourcentage) non vérifiée |
| Gratuit au-dessus d'un montant | `free_over`, `amount` | Standard complémentaire | Montant de commande hors livraison, comparé avec « supérieur ou égal » ; non applicable aux méthodes à règles ; prix mis à 0 avec un avertissement |
| Produit de livraison | `product_id` (obligatoire) | Socle | Porte les taxes et la comptabilité (D3) |
| Zone | `country_ids`, `state_ids`, `zip_prefix_ids` | Standard complémentaire | Liste vide = partout |
| Limites | `max_weight`, `max_volume` | Standard complémentaire | Somme de poids (volume) × quantité des lignes ; limite vide ou 0 = pas de limite ; un produit sans poids compte pour 0 (déduit) |
| Tags produit | `must_have_tag_ids`, `excluded_tag_ids` | Option avancée | Au moins un tag requis présent (OU) ; aucun tag exclu présent |
| Description | `carrier_description` | Standard complémentaire | |
| Publication | `website_published` | Socle | |
| Société | `company_id` | Option avancée | Liée au produit de livraison |
| Suivi | `tracking_url` (marqueur de numéro) | Socle | |
| Niveau d'intégration | `integration_level` (`rate`, `rate_and_ship`) | Option avancée | Tarif seul, ou tarif et création de l'envoi |
| Production, journalisation | `prod_environment`, `debug_logging` | Option avancée | |
| Contre-remboursement | `allow_cash_on_delivery` | Option avancée | Lien avec ECOM-07 |
| Retours | `return_label_on_delivery`, `get_return_label_from_portal`, `can_generate_return` | Option avancée | |
| Assurance | `shipping_insurance`, `supports_shipping_insurance` | Option avancée | |
| Expédition : transporteur, suivi | `stock.picking` : `carrier_id`, `carrier_tracking_ref`, `carrier_tracking_url` | Socle | |
| Expédition : statut | `state` | Socle | Voir §4 |
| Mode de livraison de la commande | `sale.order.carrier_id` | Socle | |
| Montant de livraison | `amount_delivery` | Dérivé | HT ou TTC selon le réglage boutique (ECOM-03 D7) |

## 4. États et transitions

Expédition (Odoo : `stock.picking.state`) :

| État SpecForge *(proposition)* | État Odoo | Description |
|---|---|---|
| Brouillon | `draft` | Création en cours |
| En attente | `waiting`, `confirmed` | En attente d'une autre opération ou de stock |
| Prête | `assigned` | Stock réservé, prête à expédier |
| Expédiée | `done` | Transfert validé |
| Annulée | `cancel` | |

Remarques :
- `done` dans Odoo est la validation du transfert, pas la remise au client. Aucun état « livrée » n'est visible dans les champs lus.
- Le statut est calculé (`compute='_compute_state'`, stocké).
- Une expédition est créée à la confirmation de la commande (`_action_launch_stock_rule`, ECOM-06 et ECOM-09).
- L'annulation d'une commande annule les expéditions non terminées ; une expédition terminée n'est pas annulée (ECOM-06 §4).

Chaîne de tarification d'une commande :
1. Le client choisit une méthode parmi les méthodes disponibles.
2. Le tarif est calculé, puis la ligne de livraison est créée ou mise à jour.
3. Chaque modification du panier recalcule le tarif ; si le tarif échoue, la ligne est retirée (ECOM-05 §5.9).
4. À la confirmation, les frais sont figés (D3).

## 5. Invariants et règles de validation

1. Un panier contenant un produit livrable exige une méthode de livraison choisie et compatible avec l'adresse pour être payé (ECOM-05 §5.10).
2. Un panier de services seulement n'a pas de frais de livraison (D7).
3. Une méthode n'est proposée que si elle est publiée, de la bonne société, et compatible avec l'adresse, le poids, le volume et les tags du panier (Odoo : `_get_delivery_methods`, `_match`).
4. Une méthode à règles n'est proposée que si son tarif est calculable ; une méthode externe est proposée sans appel au transporteur, et son échec de tarif apparaît ensuite (Odoo : `_is_available_for_order`).
5. Le tarif est recalculé à chaque modification du panier et à l'entrée dans le checkout ; en cas d'échec, la ligne de livraison est retirée (Odoo : `_verify_cart_after_update`, `shop_checkout`).
6. Le prix de livraison passe par les taxes du produit de livraison et la position fiscale, puis la marge (sauf type prix fixe), puis l'arrondi de la devise, puis la règle de gratuité (Odoo : `rate_shipment`, `_apply_margins`).
7. Une règle de gratuité s'applique si le montant de la commande hors livraison est supérieur ou égal au seuil, jamais aux méthodes à règles ; un avertissement l'indique et le tarif réel du transporteur est conservé (Odoo : `carrier_price`).
8. Les frais sont figés à la création de la commande (D3).
9. Si aucune méthode n'est disponible pour une commande livrable, le paiement est bloqué avec un message (Odoo : `_get_shop_payment_errors`).
10. Un lien de suivi n'existe que si un transporteur et une référence de suivi sont renseignés (Odoo : `carrier_tracking_url`).
11. Annuler une commande annule ses expéditions non terminées.
12. Chaque changement de statut d'expédition est tracé (ECOM-19).

## 6. Erreurs et cas particuliers

- Tarif en échec (transporteur injoignable, adresse non desservie) : la ligne de livraison est retirée, le paiement est refusé avec un message.
- Aucune méthode disponible : message « livraison impossible » au paiement.
- Poids ou volume dépassé : la méthode disparaît de la liste.
- Produit sans poids ou volume : compte pour 0 dans le total (Odoo : `_match_weight`, déduit d'un champ Float), donc une limite peut être contournée. À décider : exiger un poids pour les produits livrables dès qu'une limite existe.
- Adresse modifiée après le choix : le tarif est recalculé ; la méthode peut ne plus être compatible.
- Commande annulée après expédition terminée : l'expédition n'est pas annulée (ECOM-06 §4), à traiter avec ECOM-11.
- Préfixes postaux : Odoo les utilise dans une expression régulière sans échappement (`_match_address`) ; ne pas reprendre ce mécanisme tel quel.
- Devise du tarif : implicite dans Odoo ; à expliciter dans le contrat (D4).
- Plusieurs expéditions pour une commande (livraisons partielles) : non lu, voir ECOM-09.

## 7. Contrat d'un transporteur externe (T5)

**Principe :** le cœur appelle un contrat explicite ; chaque transporteur l'implémente. Un nouveau transporteur s'ajoute sans modifier le cœur (D1). Dans Odoo, le contrat est implicite et nommé par convention, et les connecteurs externes sont en Enterprise.

**Opérations demandées au transporteur :**

| Responsabilité | Hook Odoo (signature lue) |
|---|---|
| Calculer le tarif d'une commande | `rate_shipment(order)` puis `<type>_rate_shipment(order)` |
| Créer l'envoi | `send_shipping(pickings)` ; renvoie `exact_price` et `tracking_number` par envoi, ou `None` si le type ne l'implémente pas |
| Annuler l'envoi | `cancel_shipment(pickings)` |
| Fournir le lien de suivi | `get_tracking_link(picking)` |
| Étiquette de retour | `can_generate_return`, `get_return_label_prefix` (contenu non lu) |

**Réponse de tarification (Odoo, docstring) :** succès, prix, message d'erreur, avertissement. SpecForge ajoute la devise (D4).

**Réponse de création d'envoi (Odoo, docstring) :** prix exact et numéro de suivi, avec trois `TODO` (étiquettes par colis, devise, succès/erreur/avertissements). SpecForge les ajoute (D10). Dans Odoo, une méthode non implémentée renvoie `None` sans erreur (sauf `rate_shipment`) : le contrat SpecForge impose une réponse explicite ou une capacité déclarée.

**Capacités déclarées *(proposition, Odoo : `integration_level`, `supports_shipping_insurance`, `can_generate_return`)* :** tarif seul ou tarif et création d'envoi, retours, assurance, contre-remboursement, zones, poids et volumes maximums.

**Données échangées *(déduit, contenu non lu)* :**
- Cœur vers transporteur : adresses d'expédition et de livraison, colis (poids, dimensions), valeur déclarée, options.
- Transporteur vers cœur : tarif, référence de suivi, étiquette (document), messages.

**Événements :** tarif calculé, envoi créé, envoi annulé, suivi mis à jour *(proposition, D9)*, livré *(proposition)*.

**Erreurs à prévoir :** adresse non desservie, poids ou dimensions hors limites, transporteur injoignable, authentification refusée, réponse de tarif incohérente, annulation impossible (envoi déjà pris en charge).

**Hors contrat :** formulaires de configuration, format des étiquettes, protocoles propres à chaque transporteur.

## 8. Frontières

- **Commande ≠ expédition :** la commande engage, l'expédition l'exécute ; les statuts sont distincts (D5).
- **Expédition ≠ stock :** Odoo porte l'expédition sur un document de stock (`stock.picking`) ; SpecForge distingue l'envoi (cette fiche) de la réservation et du mouvement de stock (ECOM-09).
- **Retour physique ≠ remboursement :** l'étiquette et la réception relèvent d'ECOM-11 ; le remboursement financier d'ECOM-07.
- **Tarif ≠ taxe :** la taxe est celle du produit de livraison (ECOM-03).
- **Contre-remboursement :** option de la méthode qui touche le paiement (ECOM-07).
- **Externalisable :** tarification en temps réel, étiquettes, suivi (ECOM-18).
- **Extensions Odoo :** point relais (`delivery_mondialrelay`, `website_sale_mondialrelay`) et retrait en magasin (`website_sale_collect`, qui surcharge `_validate_transaction_for_order`) ; non lus en détail.

## 9. Dépendances

- Entrantes : ECOM-05 (panier), ECOM-01 (poids, volume, tags), ECOM-03 (taxes, devise), ECOM-10 (adresses), ECOM-06 (confirmation).
- Sortantes : ECOM-09 (préparation), ECOM-11 (retours), ECOM-14 (notifications d'expédition), ECOM-15, ECOM-17 (bon de livraison), ECOM-18, ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Méthode de livraison | `delivery` | `delivery.carrier`, `delivery_type`, `price_rule_ids` |
| Disponibilité | `delivery` | `_match`, `_match_address`, `_is_available_for_order`, `available_carriers` |
| Tarif | `delivery` | `rate_shipment`, `_apply_margins` |
| Livraison dans la commande | `delivery`, `website_sale` | `_set_delivery_method`, `_get_delivery_methods`, `_remove_delivery_line`, ligne `is_delivery` |
| Expédition, suivi, annulation | `stock_delivery` | `send_shipping`, `get_tracking_link`, `cancel_shipment`, `carrier_tracking_ref` |
| Statut d'expédition | `stock` | `stock.picking.state` |
| Point relais | `delivery_mondialrelay` | non lu |
| Retrait en magasin | `website_sale_collect` | non lu |

Licences : `delivery`, `stock_delivery`, `delivery_mondialrelay` et `website_sale_collect` en LGPL-3 (vérifié). D'après le texte d'aide de `delivery_carrier.py` et le `ls`, les connecteurs de transporteurs externes ne sont pas dans Community : seule la conception est réutilisable.

## 11. Classement (T6)

- **Socle :** méthodes à prix fixe et à règles, disponibilité par zone, ligne de frais figée, statut d'expédition, lien de suivi.
- **Standard complémentaire :** marges, gratuité au-dessus d'un montant, limites de poids et de volume, colis, notifications d'expédition.
- **Option avancée :** transporteurs externes (contrat §7), tags produit, étiquettes de retour, assurance, contre-remboursement, point relais, retrait en magasin, livraisons partielles.

## 12. Points non vérifiés

- Valeurs de `VARIABLE_SELECTION`, formule des règles de prix (`variable_factor`, `list_base_price`), `_create_delivery_line`, unité de `margin`.
- Retrait en point relais (`_set_pickup_location`, convention `<type>_use_locations`).
- Corps de `send_shipping`, `cancel_shipment`, `get_tracking_link` ; usage réel de `integration_level` à la validation.
- Colis (`stock_package`), livraisons partielles, retours et étiquettes.
- Statut « livré » et réception des notifications de suivi ; délai de livraison estimé (non vu dans les champs lus).
- `website_sale_collect`, `delivery_mondialrelay`, `delivery_stock_picking_batch`.
