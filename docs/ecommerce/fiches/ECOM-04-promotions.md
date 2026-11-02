# ECOM-04 — Promotions

**Version :** 0.2 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 vérifiée : `loyalty`, `sale_loyalty`, `website_sale_loyalty`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Socle : promotion automatique et code de réduction *(proposition)* | Non : tous les types sont dans le même module |
| D2 | Un programme = des règles (conditions) et des récompenses | Oui : `loyalty.program`, `loyalty.rule`, `loyalty.reward` |
| D3 | Déclenchement : automatique dans le panier, ou par saisie d'un code | Oui : `trigger` = `auto` ou `with_code` (`loyalty_program.py:135-144`) |
| D4 | Conditions : quantité minimale, montant minimal avec son mode de taxe, ciblage par produit, catégorie ou étiquette | Oui : `loyalty_rule.py:48-68` |
| D5 | Récompenses : remise ou produit offert, remise plafonnable | Oui pour le type et l'applicabilité (`loyalty_reward.py:63-85`), liste des modes de remise non lue |
| D6 | Carte cadeau et porte-monnaie sont des moyens de paiement, pas des remises : option avancée *(proposition)* | Partiel : `is_payment_program` lu (`loyalty_program.py:160, 260`) |
| D7 | Fidélité (points) et coupons de prochaine commande : option avancée *(proposition)* | Partiel : types lus (l. 96-104), comportement non lu |
| D8 | Règle et récompense se désactivent sans être supprimées | Partiel : `active` lu (`rule:39`, `reward:47`), programme non lu |
| D9 | Règles d'ordre et de cumul de plusieurs promotions à définir *(proposition)* | Partiel : pas de cumul de remises globales lu (`sale_order.py:1437-1447`), autres cumuls non lus |
| D10 | Dates de validité et limites d'usage d'un programme | Oui : `loyalty_program.py:109-118` ; `sale_order.py:671-675, 1075-1077, 1507-1508` |

## 1. Objectif et périmètre

Définir les réductions et avantages appliqués à une commande.

Dans le périmètre : promotion automatique, code de réduction, produit offert, plafond de remise.

Hors périmètre : calcul des prix et taxes (ECOM-03), paiement (ECOM-07), courriels (ECOM-14).

## 2. Objets métier

- **Programme** : ensemble de règles et de récompenses, de l'un des huit types lus.
- **Règle** : conditions de déclenchement et points accordés.
- **Récompense** : remise ou produit offert.
- **Carte** : porteur de points ou de code (`loyalty.card`).
- **Code** : saisie qui déclenche un programme de type `with_code`.
- **Programme de paiement** : carte cadeau ou porte-monnaie, traité comme un paiement.

## 3. Données

| Objet | Donnée | Statut |
|---|---|---|
| Programme | type parmi huit valeurs, déclenchement `auto` ou `with_code`, portée `current`, `future`, `both` | Lu : `loyalty_program.py:96-144` |
| Programme | dates de validité, limite d'usage et maximum | Lu : `date_from`, `date_to`, `limit_usage`, `max_usage` (l. 109-118) |
| Programme | listes de prix autorisées | Lu : `pricelist_ids` (l. 43) ; corps de la contrainte non lu |
| Programme | affichage client `portal_visible` (faux par défaut), nom des points | Lu (l. 145-158) |
| Règle | quantité minimale (1), montant minimal, mode de taxe (`incl` par défaut) | Lu : `loyalty_rule.py:66-75` |
| Règle | ciblage produit, catégorie, étiquette, domaine ; points accordés (> 0) ; mode ; code | Lu : l. 48-52, 54, 77-90 |
| Récompense | type `product` ou `discount` (défaut `discount`) | Lu : `loyalty_reward.py:63-70` |
| Récompense | remise (10), mode (`percent` par défaut), plafond, applicabilité `order`, `cheapest`, `specific` | Lu : l. 74-85, 100 ; liste des modes non lue |
| Récompense | produit offert, quantité (1) | Lu : l. 114-126 |
| Carte | code, points, programme, client, date d'expiration | Lu : `code` (obligatoire, généré par défaut), `points` (`tracking=True`), `partner_id` (indexé), `expiration_date`, `active` (vrai par défaut) (`loyalty_card.py:28-49`) ; suite du modèle non lue |
| Commande | programmes et coupons appliqués, lignes de récompense | Lu : `applied_coupon_ids`, `is_reward_line` (`sale_order.py:1060, 1476`) |

## 4. États et transitions

| Objet | États | Statut |
|---|---|---|
| Programme | actif, archivé | Lu : `active` et contrôle d'archivage en cours de devis (`sale_order.py:1081-1083`) |
| Coupon | valide, expiré, utilisé (points sous le minimum requis) | Lu : `sale_order.py:1488-1491` |
| Programme sur une commande | non appliqué → appliqué | Lu : refus si déjà appliqué (l. 1426-1427) |
| Récompense | appliquée à la commande, recalculée à chaque mise à jour | Lu (l. 1045-1050) |

Transition clé : une promotion appliquée à un devis est revérifiée à chaque mise à jour ; si le programme est archivé entre-temps, il passe en erreur.

## 5. Invariants et règles de validation

1. Un programme n'est appliqué que s'il correspond au domaine de la commande (`sale_order.py:1424-1425`).
2. Un programme déjà appliqué n'est pas appliqué deux fois (l. 1426-1427).
3. Deux remises globales ne se cumulent pas : l'application est refusée avec un message qui nomme l'autre remise (l. 1437-1447).
4. Si un programme a plusieurs remises globales, la plus avantageuse est retenue (l. 1431-1436).
5. `_try_apply_program` ne donne pas la récompense : elle est appliquée à part (l. 1418).
6. Un code est cherché comme règle `with_code`, puis comme coupon (l. 1467-1482).
7. Un code déjà appliqué, inconnu, expiré ou épuisé est refusé avec un message distinct (l. 1478, 1487, 1489, 1491, 1495).
8. Un programme `loyalty` ou `ewallet` ne s'applique pas par code (l. 1496-1497).
9. La limite d'usage exclut un programme automatique quand le nombre de commandes atteint le maximum (l. 1075-1077).
10. Le maximum d'usage est strictement positif si l'usage est limité (`loyalty_program.py:177-178`).
11. Les points accordés par une règle sont strictement positifs (`loyalty_rule.py:89-90`).
12. Les promotions sont recalculées à chaque modification de la commande (`sale_order.py:1045-1050`).
13. Carte cadeau et porte-monnaie sont traités comme paiement (`loyalty_program.py:260`) *(proposition de classement : option avancée, D6)*.
14. Les règles d'ordre entre promotions autres que les remises globales sont à définir *(proposition, D9)*.
15. Un programme n'est applicable que s'il est actif, vendable, de la société de la commande ou de sa parente, compatible avec sa liste de prix et dans ses dates (`sale_order.py:665-675`).
16. La date de référence est celle de la plus ancienne transaction confirmée, sinon le jour courant (`sale_order.py:698-708`).
17. Deux applications simultanées d'un même code sont sérialisées par un verrou de ligne (`sale_order.py:1503-1505`).
18. La confirmation est refusée si un coupon de la commande a des points réels négatifs (l. 151-154).
19. À la confirmation, les points sont ajoutés aux coupons et les coupons de programmes `current` sans récompense réclamée sont supprimés (l. 159-168).
20. À l'annulation d'une commande confirmée, les points sont retirés, l'historique et les lignes de récompense sont supprimés (l. 186-206).

## 6. Erreurs et cas particuliers

| Cas | Comportement attendu | Statut |
|---|---|---|
| Programme hors domaine de la commande | Refus « not available for this order » | Lu (l. 1424-1425) |
| Programme déjà appliqué | Refus | Lu (l. 1426-1427) |
| Remise globale incompatible avec une autre | Refus, demande de retirer l'autre | Lu (l. 1437-1447) |
| Code inconnu ou programme archivé | Refus, `not_found` | Lu (l. 1487, 1495) |
| Code déjà appliqué | Refus | Lu (l. 1478) |
| Coupon expiré | Refus | Lu (l. 1488-1489) |
| Coupon déjà utilisé | Refus | Lu (l. 1490-1491) |
| Code d'un programme de fidélité ou de porte-monnaie | Refus | Lu (l. 1496-1497) |
| Programme archivé pendant le devis | Passage en erreur à la mise à jour | Lu (l. 1081-1083) |
| Limite d'usage atteinte | Programme automatique non retenu | Lu (l. 1075-1077) |
| Deux clients appliquent le même code en même temps | Verrou `FOR UPDATE NOWAIT` : le second échoue en erreur de sérialisation, transaction rejouée | Lu (l. 1499-1505) |
| Limite d'usage atteinte à la saisie du code | Refus « code expiré » | Lu (l. 1507-1508) |
| Échec d'application après activation d'une règle | Règle et coupon retirés de la commande | Lu (l. 1525-1529) |
| Date de référence des promotions | Création de la plus ancienne transaction confirmée (`done` ou `authorized`), sinon jour courant dans le fuseau de la société | Lu (`sale_order.py:698-708`) ; fin de la méthode non lue |
| Cumul de promotions hors remises globales | Non établi | Non lu |
| Annulation d'une commande confirmée | Points retirés, historique et lignes de récompense supprimés, coupons non utilisés supprimés | Lu (`sale_order.py:185-207`) |
| Confirmation avec un coupon à points négatifs | Refus | Lu (l. 151-154) |
| Retour ou remboursement après confirmation | Sort des points et coupons | Non lu (ECOM-11) |
| Lien `/coupon/<code>` ouvert sans connexion | Route publique, sans restriction de méthode dans le décorateur ; stocke le code en session, l'applique si un panier existe, sinon avertit qu'il sera appliqué à l'ajout d'un article ; supprime les paramètres entrants `coupon_error` et `coupon_error_type` ; redirige vers `r` (défaut `/shop`), non validé dans ces lignes | Lu (`main.py:38-57`) ; effet de `request.redirect` sur une URL externe non lu |
| Saisie d'un code sur le panier | Un code inconnu des promotions retombe sur la méthode `pricelist` du module parent ; une erreur est mise en session ; une récompense est appliquée directement si elle est unique ou choisie parmi celles proposées (produit requis pour un `multi_product`) | Lu (`main.py:14-36`) |
| Réclamation d'une récompense (`/shop/claimreward`) | Route publique ; la récompense doit figurer parmi les récompenses réclamables de la commande en cours, sinon rien n'est appliqué ; selon le déclenchement et le code, bascule vers la saisie d'un code ; l. 77 : appel à `request.redirect` sans `return`, le traitement continue | Lu (`main.py:59-94`) ; corps de `_apply_reward` non lu |

## 7. Parcours

| # | Parcours | Étapes |
|---|---|---|
| P1 | Promotion automatique | Panier modifié → programmes automatiques éligibles recherchés (domaine, limite d'usage) → points et récompenses recalculés |
| P2 | Code de réduction | Saisie → recherche d'une règle `with_code`, sinon d'un coupon → contrôles → verrou → application ou refus avec message |
| P3 | Remise globale concurrente | Une remise globale existe déjà → comparaison des montants → refus si l'existante est meilleure, demande de la retirer |
| P4 | Programme archivé en cours de devis | Mise à jour de la commande → programme hors domaine → passage en erreur |
| P5 | Confirmation et annulation | Confirmation : contrôle des points, recalcul, historique, points ajoutés aux coupons, courriel de coupon ; annulation : points retirés, historique et lignes de récompense supprimés | 
| P6 | Création d'un programme | Programme, règles, récompenses, dates, limite d'usage *(vues d'administration non lues)* |

## 8. Frontières

| Sujet | Fiche | Part de cette fiche |
|---|---|---|
| Prix, taxes, listes de prix | ECOM-03 | Montant minimal avec ou sans taxes, restriction par liste de prix |
| Panier | ECOM-05 | Recalcul des promotions à chaque modification |
| Commandes | ECOM-06 | Confirmation et annulation avec promotion (lu : `sale_order.py:140-207`) |
| Paiements | ECOM-07 | Carte cadeau et porte-monnaie comme paiement ; date de référence liée à la transaction |
| Comptes clients | ECOM-10 | Cartes nominatives rattachées au client |
| Retours | ECOM-11 | Sort des points et coupons à un retour (non lu) |
| Notifications | ECOM-14 | Courriels de coupon (`loyalty_mail`, non lu) |
| Statistiques | ECOM-15 | Usage des programmes (non lu) |

## 9. Dépendances

- ECOM-03 Prix, taxes : montants et listes de prix.
- ECOM-05 Panier : recalcul.
- ECOM-06 Commandes : application et annulation.
- ECOM-07 Paiements : programmes de paiement, date de référence.
- ECOM-10 Comptes clients : cartes nominatives.
- ECOM-11 Retours : points et coupons.
- ECOM-14 Notifications : courriels de coupon.

## 10. Correspondance Odoo

| Concept | Élément Odoo 19.0 | Référence |
|---|---|---|
| Programme | `loyalty.program` | `loyalty/models/loyalty_program.py:11-187` |
| Règle | `loyalty.rule` | `loyalty/models/loyalty_rule.py:11-90` |
| Récompense | `loyalty.reward` | `loyalty/models/loyalty_reward.py:12-126` |
| Carte, coupon | `loyalty.card` | `loyalty/models/loyalty_card.py:11` ; corps non lu |
| Domaine applicable | `_get_program_domain` | `sale_loyalty/models/sale_order.py:665-675` |
| Date de référence | `_get_confirmed_tx_create_date` | `sale_order.py:698-708` |
| Application d'un programme | `_try_apply_program` | `sale_order.py:1411-1453` |
| Application d'un code | `_try_apply_code` | `sale_order.py:1455-1530` |
| Mise à jour automatique | `_update_programs_and_rewards` | `sale_order.py:1045-1085` |
| Remise globale | `_best_global_discount_already_applied` | `sale_order.py:871-881` |

Licence : LGPL-3 pour `loyalty`, `sale_loyalty`, `website_sale_loyalty` (voir L7).

## 11. Classement (T6)

| Capacité | Classe |
|---|---|
| Promotion automatique dans le panier | Socle |
| Code de réduction | Socle |
| Remise en pourcentage ou montant sur la commande | Socle |
| Montant ou quantité minimal | Socle |
| Dates de validité | Socle |
| Pas de cumul de remises globales | Socle |
| Produit offert | Standard complémentaire |
| Plafond de remise, ciblage produit, catégorie, étiquette | Standard complémentaire |
| Limite d'usage, restriction par liste de prix | Standard complémentaire |
| Carte cadeau, porte-monnaie *(proposition)* | Option avancée |
| Fidélité par points, coupons de prochaine commande *(proposition)* | Option avancée |
| Achetez X, obtenez Y *(proposition)* | Option avancée |

## 12. Points non vérifiés

- Retour ou remboursement après confirmation : aucune lecture (ECOM-11) ; `_get_point_changes`, `_get_real_points_for_coupon`, `_add_loyalty_history_lines`, `_send_reward_coupon_mail` non lus.
- Sort des points et coupons à un retour ou un remboursement (ECOM-11).
- Valeurs de `discount_mode` et `reward_point_mode` (fonctions de sélection non lues).
- Cumul de promotions hors remises globales ; ordre d'application.
- Fin de `_best_global_discount_already_applied`, de `_get_confirmed_tx_create_date`, de `_try_apply_code` après la ligne 1530.
- Modèle `loyalty.card` : champs, expiration, génération de codes.
- `loyalty_history`, `loyalty_mail`, `product_pricelist`, `res_partner` du module `loyalty`.
- Module `website_sale_loyalty` : routes lues (`main.py:14-94`), corps de `_apply_reward` (l. 96 et suivantes) non lu ; `cart.py`, `delivery.py`, `payment.py`, `portal.py` et modèles non lus ; effet de `request.redirect` sur une URL externe (`r` n'est pas validé dans les routes lues) ; rôle de `website_links`.
- Modèle `loyalty.card` : champs lus l. 28-49 ; suite du fichier, cible de `history_ids` et options de `program_id` non lues.
- Type `buy_x_get_y` : comportement non lu ; liste des huit types possiblement incomplète (sortie tronquée à la ligne 104).
- Programmes de paiement : interaction avec ECOM-07 et ECOM-03.
- Propositions non lues : D1, D6, D7, D9, règles 13 et 14.
