# ECOM-11 — Retours et remboursements

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `stock`, `payment`, `account`, `account_payment`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Trois objets liés aux statuts indépendants : demande de retour, retour physique, remboursement | Oui : Odoo n'a que des actions de back-office séparées (assistant de retour de stock, assistant de remboursement, avoir) sans objet commun |
| D2 | Socle : le remboursement est décidé par l'administrateur après réception du retour ; remboursement avant réception : option | Oui : Odoo ne relie pas retour et remboursement |
| D3 | Un retour est plafonné à la quantité livrée moins la quantité déjà retournée, par ligne | Non : `action_create_returns_all` calcule livré − déjà retourné ; une quantité nulle partout est refusée |
| D4 | Un remboursement est plafonné au montant payé moins les remboursements confirmés ; règle du domaine paiement | Partiel : le plafond existe dans `account_payment` (`amount_available_for_refund`), pas dans `payment` |
| D5 | Seule une transaction réussie se rembourse ; une autorisation non capturée s'annule | Non : `action_refund` exige l'état `done` ; `action_void` existe |
| D6 | Remboursement par le prestataire si celui-ci et le moyen de paiement le supportent ; sinon remboursement manuel enregistré *(proposition)* | Partiel : `support_refund` à `none` bloque le remboursement ; le cas manuel n'est pas lu |
| D7 | L'avoir est un document dérivé du remboursement (ECOM-17) ; il ne déclenche pas le remboursement | Non : `account.move.reversal` ne contacte pas le prestataire ; le lien est séparé (`payment.refund.wizard`) |
| D8 | Le client peut demander un retour depuis son compte *(proposition)* | Oui : aucune demande de retour côté client dans Community, seul le rachat existe |
| D9 | Échange de produit : option avancée | Non : `_create_exchange` |
| D10 | Un remboursement porte un montant libre (partiel ou total), éventuellement décomposé par ligne et frais de livraison *(proposition)* | Partiel : `amount_to_refund` libre, défaut = montant total de la transaction |
| D11 | Un produit reçu en retour n'est remis en stock vendable qu'après décision de l'administrateur *(proposition)* | Non lu : le comportement du bon de retour n'est pas lu |
| D12 | Un retour ne déclenche jamais de nouvelle réservation de stock | Partiel : un retour ne réduit la quantité traitée que si son mouvement est `to_refund` (ECOM-09) |
| D13 | Annuler une commande payée impose un remboursement ou une annulation d'autorisation | Non lu : `_action_cancel` ne montre pas de remboursement (ECOM-06 §6) |

## 1. Objectif et périmètre

Définir comment un client rend un produit, comment la boutique le réceptionne et le rembourse, et comment ces trois actions restent indépendantes mais liées.
La commande est en ECOM-06, le paiement en ECOM-07, l'expédition en ECOM-08, le stock en ECOM-09, les documents en ECOM-17.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Demande de retour | Lignes, quantités, motif, statut | Standard complémentaire |
| Retour physique | Réception des produits en stock | Socle |
| Remboursement | Montant rendu au client, via une transaction de remboursement | Socle |
| Avoir | Document comptable dérivé | Standard complémentaire |
| Motif de retour | Liste de motifs | Standard complémentaire |
| Étiquette de retour | Envoi du colis par le client | Option avancée |
| Échange | Produit de remplacement | Option avancée |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Retour : bon source | `stock.return.picking` : `picking_id` | Socle | Assistant transitoire de back-office |
| Retour : lignes | `product_return_moves` : `product_id`, `move_id`, `quantity` (défaut 1), `uom_id` | Socle | Quantité nulle partout refusée |
| Retour : bon créé | nouveau `stock.picking` copié du bon d'origine | Socle | Confirmé et réservé à la création |
| Quantité retournable | calculée dans `action_create_returns_all` : livré − déjà retourné | Dérivé | D3 |
| Drapeau « à rembourser » | `to_refund` sur le mouvement | Standard complémentaire | Influence la quantité traitée (D12) |
| Remboursement : montant | `amount_to_refund` | Socle | Défaut = montant total de la transaction |
| Remboursement : disponible | `amount_available_for_refund` | Dérivé | Payé − remboursements confirmés ; D4 |
| Remboursement : en attente | `has_pending_refund` | Dérivé | Calcul non lu |
| Remboursement : transaction | `payment.transaction` enfant : `operation = 'refund'`, montant négatif, référence `R-...`, `source_transaction_id` | Socle | ECOM-07 §4 |
| Support du remboursement | `support_refund` (`none`, `full_only`, `partial`) | Socle | Prestataire et moyen de paiement |
| Paiement source | `source_payment_id` | Standard complémentaire | Lien comptable |
| Avoir | `account.move` inverse : `reason`, `date`, `journal_id` | Standard complémentaire | Assistant `account.move.reversal` |
| Demande de retour *(proposition)* | commande, lignes, quantités, motif, statut, dates | Standard complémentaire | D8 |

## 4. États et transitions

**Demande de retour *(proposition)*** :

| État | Description |
|---|---|
| Demandée | Créée par le client ou l'administrateur |
| Acceptée | Retour autorisé, quantités validées |
| Refusée | Motif obligatoire |
| Reçue | Produits réceptionnés en stock |
| Clôturée | Retour traité et, si applicable, remboursé |
| Annulée | Demande retirée avant réception |

| Transition | Condition |
|---|---|
| Demandée → Acceptée ou Refusée | Décision de l'administrateur |
| Acceptée → Reçue | Réception enregistrée (mouvement entrant, ECOM-09) |
| Demandée ou Acceptée → Annulée | Avant réception |
| Reçue → Clôturée | Remboursement traité ou décision de ne pas rembourser |

**Retour physique (Odoo : `stock.picking.state`, ECOM-08 §4)** : `draft`, `waiting`, `confirmed`, `assigned`, `done`, `cancel`. Le bon de retour est confirmé et réservé dès sa création.

**Remboursement (états de la transaction enfant, ECOM-07 §4)** :

| Statut remboursement | État de la transaction |
|---|---|
| Demandé | `draft` |
| En attente | `pending` |
| Effectué | `done` |
| Échec | `error` (la source reste inchangée) |
| Annulé | `cancel` |

**Indépendance :** un retour peut exister sans remboursement, et un remboursement sans retour (geste commercial, produit non reçu). La liaison est une règle de boutique, pas une contrainte du cœur (D2).

## 5. Invariants et règles de validation

1. Un retour porte sur des lignes d'une commande dont l'expédition est terminée (Odoo : l'assistant part d'un bon d'expédition).
2. Au moins une quantité non nulle ; sinon refus (Odoo : `UserError`).
3. Quantité retournée par ligne ≤ livré − déjà retourné (D3).
4. La création du retour libère les réservations ouvertes des mouvements de destination de la ligne (Odoo : `_create_return`, `_do_unreserve`).
5. Un remboursement porte sur une transaction réussie ; une autorisation non capturée s'annule (D5).
6. Un remboursement ≤ montant payé − remboursements confirmés (D4). Seuls les remboursements confirmés comptent : un remboursement en échec ne bloque pas un nouvel essai (Odoo : commentaire de `_compute_amount_available_for_refund`).
7. Le remboursement par le prestataire exige que le prestataire et le moyen de paiement supportent `support_refund` ; un remboursement partiel exige `partial` (D6).
8. Un remboursement en attente bloque un second remboursement sur la même transaction *(proposition ; Odoo : `has_pending_refund` existe, calcul non lu)*.
9. Un échec du prestataire met la transaction de remboursement en `error`, avec le message ; la source reste inchangée (Odoo : `_refund`).
10. Le remboursement est une transaction enfant de montant négatif, rattachée à la source (Odoo : `_create_child_transaction`).
11. Un retour ne déclenche jamais de nouvelle réservation (D12).
12. Un retour reçu ne remet pas le stock en vente sans décision (D11).
13. Un avoir ne rembourse pas ; il est créé à partir du remboursement ou de la facture (D7).
14. Chaque décision (acceptation, refus, réception, remboursement) est tracée avec son auteur et sa cause (ECOM-19).
15. Seul le client de la commande, ou un administrateur, peut demander un retour (ECOM-16).

## 6. Erreurs et cas particuliers

- Remboursement supérieur au disponible : refus avec le montant maximal.
- Prestataire sans support de remboursement : remboursement manuel enregistré (D6, proposition).
- Prestataire désactivé : refus (Odoo : `_ensure_provider_is_not_disabled`).
- Transaction non réussie : refus avec « seules les transactions confirmées peuvent être remboursées » (Odoo : `action_refund`).
- Remboursement partiel puis total : le disponible diminue à chaque remboursement confirmé.
- Retour partiel : seul le reliquat reste retournable.
- Produit reçu endommagé : décision d'administration (D11), remboursement possible selon la politique de la boutique.
- Commande annulée avant expédition mais déjà payée : remboursement ou annulation d'autorisation (D13) ; Odoo n'en montre aucun dans `_action_cancel`, à traiter explicitement (ECOM-06 §6).
- Paiement réussi sur une commande annulée : même cas (ECOM-06 §6).
- Frais de livraison : politique à définir ; le montant du remboursement est libre (D10).
- Retour d'un produit déjà remboursé sans retour : autorisé, les deux sont indépendants (D2).
- Délai légal de rétractation et de retour : propre à chaque pays, non étudié ici (ne pas supposer).

## 7. Parcours

**Odoo Community :** back-office seulement. Le retour physique est créé par un assistant sur le bon d'expédition, le remboursement par un assistant sur le paiement, l'avoir par un assistant sur la facture. Le client n'a pas de demande de retour (le rachat existe, ECOM-05).

**SpecForge *(proposition)* :**
1. Le client choisit des lignes et un motif depuis sa commande (ECOM-10).
2. L'administrateur accepte ou refuse, avec un motif de refus.
3. Le client renvoie le colis, éventuellement avec une étiquette (option avancée).
4. L'administrateur enregistre la réception ; le stock est mis à jour (ECOM-09).
5. L'administrateur décide du remboursement, total ou partiel.
6. Le prestataire exécute le remboursement (ECOM-07), l'avoir est généré (ECOM-17), le client est notifié (ECOM-14).

## 8. Frontières

- **Retour physique ≠ remboursement financier :** le retour concerne le stock, le remboursement le paiement ; chacun a son statut (D1).
- **Remboursement ≠ avoir :** le remboursement rend l'argent par le prestataire, l'avoir est le document (D7).
- **Retour ≠ réservation :** un retour n'ouvre jamais de nouvelle réservation (D12, ECOM-09).
- **Remboursement ≠ annulation d'autorisation :** une autorisation non capturée s'annule (ECOM-07 §7, `action_void`).
- **Retour ≠ expédition :** le retour utilise un bon d'expédition inverse ; l'étiquette relève d'ECOM-08 (`can_generate_return`).
- **Externalisable :** remboursement par le prestataire (ECOM-07), étiquettes de retour par le transporteur (ECOM-08), gestion des retours par un système externe (ECOM-18).
- **Permissions :** décision d'un retour ou d'un remboursement réservée à l'administration (ECOM-16, ECOM-12).

## 9. Dépendances

- Entrantes : ECOM-06 (commande livrée), ECOM-07 (transaction réussie), ECOM-08 (expédition terminée), ECOM-09 (réception en stock), ECOM-10 (client).
- Sortantes : ECOM-09 (stock), ECOM-07 (remboursement), ECOM-14 (notifications), ECOM-15 (statistiques de retours), ECOM-17 (avoir), ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Retour physique | `stock` | `stock.return.picking`, `_create_return`, `_process_line`, `action_create_returns_all` |
| Échange | `stock` | `_create_exchange`, `action_create_exchanges` |
| Remboursement | `payment` | `action_refund`, `_refund`, `_send_refund_request`, `_create_child_transaction` |
| Plafond, assistant | `account_payment` | `amount_available_for_refund`, `payment.refund.wizard`, `source_payment_id`, `has_pending_refund` |
| Avoir | `account` | `account.move.reversal`, `reverse_moves`, `refund_moves` |
| Quantité traitée | `sale_stock` | `_get_qty_procurement`, `_get_outgoing_incoming_moves`, `to_refund` |
| Rachat | `website_sale` | `_is_reorder_allowed`, `controllers/reorder.py` |

Licences : `stock`, `payment`, `account`, `account_payment` et `sale_stock` en LGPL-3 (vérifié). `account` est volumineux : s'inspirer, ne pas réutiliser sans étude (L7).

## 11. Classement (T6)

- **Socle :** retour physique avec quantité plafonnée, réception en stock, remboursement par le prestataire avec plafond, statuts séparés, suivi des états, traçabilité.
- **Standard complémentaire :** demande de retour par le client, motifs de retour, remboursement manuel, avoir, notifications, remboursement partiel.
- **Option avancée :** étiquettes de retour, échange, remboursement avant réception, remise en stock automatique, politique de frais de livraison, retours multi-commandes.

## 12. Points non vérifiés

- Calcul de `has_pending_refund`, contrainte `_check_amount_to_refund_within_boundaries`, `action_refund` de l'assistant.
- Pose de `to_refund` sur les mouvements de retour, fin de `_get_outgoing_incoming_moves`.
- Destination du bon de retour (emplacement de stock), `_prepare_picking_default_values`.
- Lien entre l'avoir et le remboursement du prestataire, `_reverse_moves`.
- Effet de l'annulation d'une commande payée (aucun remboursement vu dans `_action_cancel`).
- Statuts de facturation de `sale.order` (`invoice_status`) : valeurs complètes.
- Délai légal de retour ou de rétractation par pays.
