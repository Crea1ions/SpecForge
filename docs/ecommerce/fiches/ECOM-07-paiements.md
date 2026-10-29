# ECOM-07 — Paiements et intégration de plusieurs prestataires

**Version :** 0.4 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `payment`, `sale`, `website_sale`, `payment_stripe` ; 21 des 23 modules `payment_*` vérifiés)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Un prestataire est un module interchangeable derrière un contrat commun (§7) ; le cœur ne connaît aucun prestataire | Non : `payment.provider` + un module `payment_*` par prestataire |
| D2 | Le prestataire déclare ses capacités (jeton, capture manuelle, paiement express, remboursement) ; le cœur n'appelle que ce qui est déclaré | Non : champs `support_*` calculés |
| D3 | Prestataire et moyen de paiement sont deux notions : un prestataire propose plusieurs moyens (carte, virement…) | Non : `payment.method` lié en plusieurs-à-plusieurs |
| D4 | Le paiement (transaction) est un objet distinct de la commande ; la commande réagit à ses états (ECOM-06) | Non |
| D5 | Cycle de la transaction à 6 états, avec table de transitions (§4) | Non |
| D6 | Remboursements et captures partielles sont des transactions enfants rattachées à la transaction source | Non : `_create_child_transaction(amount, is_refund)` ; sémantique non lue |
| D7 | Socle : paiement intégral, capture immédiate, au moins un prestataire actif ; virement comme paiement différé | Partiel : Odoo a un prestataire `custom` pour le virement |
| D8 | Le résultat d'un paiement vient de la notification du prestataire, jamais de la seule redirection du client *(proposition)* | Partiel : `_process(provider_code, payment_data)` traite les données du prestataire ; l'origine de ces données (notification ou retour client) n'est pas lue |
| D9 | Mode par prestataire : désactivé, activé, test | Non : `state` du prestataire |

## 1. Objectif et périmètre

Définir comment un paiement est engagé, suivi et finalisé, et le contrat qui permet de brancher plusieurs prestataires sans modifier la boutique.
La commande est en ECOM-06, les remboursements métier en ECOM-11, les factures en ECOM-17, les permissions en ECOM-16.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Prestataire | Service de paiement configuré : code, mode, pays, devises, capacités | Socle |
| Moyen de paiement | Carte, virement, portefeuille… proposé par un ou plusieurs prestataires | Socle |
| Transaction | Tentative de paiement d'une commande, avec son statut | Socle |
| Notification du prestataire | Message qui fait évoluer la transaction | Socle |
| Jeton | Moyen de paiement enregistré du client | Standard complémentaire |
| Transaction enfant | Remboursement ou capture partielle | Standard complémentaire |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Prestataire : nom, code | `payment.provider` : `name`, `code` | Socle | |
| Mode | `state` (`disabled`, `enabled`, `test`) | Socle | Test = paiement factice |
| Publié | `is_published` | Socle | Visible ou non sur la boutique |
| Société, pays, devises | `company_id`, `available_country_ids`, `available_currency_ids` | Standard complémentaire | |
| Montant maximum | `maximum_amount` | Standard complémentaire | |
| Moyens de paiement | `payment_method_ids` | Socle | |
| Options | `allow_tokenization`, `capture_manually`, `allow_express_checkout` | Standard / avancé | Activables si le prestataire le supporte |
| Capacités | `support_tokenization`, `support_manual_capture` (`full_only`, `partial`), `support_express_checkout`, `support_refund` (`none`, `full_only`, `partial`) | Socle | Déclarées par le prestataire |
| Messages par état | `pre_msg`, `pending_msg`, `auth_msg`, `done_msg`, `cancel_msg` | Standard complémentaire | ECOM-13, ECOM-14 |
| Moyen : nom, code, marques | `payment.method` : `name`, `code`, `brand_ids`, `primary_payment_method_id` | Socle | |
| Moyen : pays, devises, capacités | `supported_country_ids`, `supported_currency_ids`, `support_*` | Standard complémentaire | |
| Transaction : état | `state`, `state_message`, `last_state_change` | Socle | |
| Transaction : lien | `sale_order_ids`, `provider_id`, `source_transaction_id` | Socle | Une seule commande par transaction (ECOM-06) |
| Transaction : montant | `amount` | Socle | Unités mineures + devise (ECOM-03 D2) |
| Opération | `operation` | Standard complémentaire | La valeur `validation` désigne l'enregistrement d'un moyen sans paiement ; autres valeurs non lues |
| Factures liées | `invoice_ids` | ECOM-17 | |

## 4. États et transitions

États : `draft`, `pending`, `authorized`, `done`, `cancel`, `error`.

| Vers | Depuis (Odoo : `_set_*`) |
|---|---|
| `pending` | `draft` |
| `authorized` | `draft`, `pending` |
| `done` | `draft`, `pending`, `authorized`, `error` |
| `cancel` | `draft`, `pending`, `authorized` |
| `error` | `draft`, `pending`, `authorized` |

Remarques :
- Aucune sortie de `done` ni de `cancel`. Une transaction en `error` peut devenir `done` (notification tardive).
- Un prestataire peut ajouter des états sources autorisés (`extra_allowed_states`).
- `done` et `cancel` mettent à jour la transaction source (D6), mécanisme non lu.
- Une transition interdite : comportement non lu (`_update_state`).

Effets sur la commande (ECOM-06) :

| Transaction | Effet |
|---|---|
| `pending` | Commande « en attente de paiement » (`sent`), mail d'état de paiement |
| `authorized` ou `done` | Confirmation si le montant requis est atteint |
| `done` | Facturation automatique si le réglage est actif |
| `cancel`, `error` | Aucun effet sur l'état de la commande |

## 5. Invariants et règles de validation

1. Les transitions suivent la table du §4 (Odoo : `_set_pending`, `_set_authorized`, `_set_done`, `_set_canceled`, `_set_error`).
2. Une transaction est liée à une seule commande pour confirmer (ECOM-06 D4).
3. Un second paiement simultané sur la même commande est refusé (ECOM-05 §7).
4. Un prestataire désactivé n'est pas proposé ; en mode test, le paiement est factice.
5. Une opération (capture, annulation, remboursement) n'est proposée que si le prestataire la déclare supportée (D2).
6. Le montant et la devise notifiés doivent correspondre à la transaction, sinon elle passe en erreur et aucune mise à jour n'est appliquée (Odoo : `_process` appelle `_validate_amount` avant `_apply_updates`). Un prestataire peut renvoyer `None` dans `_extract_amount_data` et sauter ce contrôle : le contrat impose qu'il le fournisse.
7. Une notification reçue deux fois ne produit pas deux fois ses effets : une transaction déjà dans l'état cible est ignorée (Odoo : `_update_state`, log INFO). Le cas d'une transition interdite n'est pas lu.
8. Un remboursement ne dépasse pas le montant encaissé non encore remboursé. `_create_child_transaction` ne contient aucun plafond. `action_refund` (lu) vérifie les droits et exige des transactions `done` (une autorisation non capturée s'annule, elle ne se rembourse pas), puis délègue à `_refund(amount_to_refund)` (lu : montant par défaut = montant total de la transaction source, aucun plafond ; l'échec du prestataire met l'enfant en `error`, la source reste inchangée). Le plafond (montant payé moins remboursements confirmés) est dans `account_payment` (`amount_available_for_refund`), module comptable absent de SpecForge : il devient une règle du domaine paiement (ECOM-11 D4).
9. *(Proposition ; Odoo : `_process` reçoit des données déjà extraites, la vérification est en amont)* Les notifications sont authentifiées (signature ou rappel vers le prestataire) avant tout changement d'état (ECOM-16).
10. Une transaction ne se supprime pas ; ses changements d'état sont tracés (ECOM-19).

## 6. Erreurs et cas particuliers

- Paiement refusé ou abandonné : `cancel` ou `error`, commande inchangée, panier utilisable (ECOM-06 D2).
- Notification tardive après `error` : la transaction peut passer en `done`.
- Paiement réussi sur une commande annulée : voir ECOM-06 §6.
- Notification pour une transaction inconnue : refus sans effet.
- Paiement partiel sous le montant requis : pas de confirmation (ECOM-06 D4).
- Plusieurs commandes pour une transaction : pas de confirmation (ECOM-06 D4).
- Opération non supportée par le prestataire : refus avec message.
- Prestataire indisponible : voir §7 (erreurs).
- Au retour du client, la transaction peut encore être en `draft` : voir ECOM-06 §12.

## 7. Contrat d'un prestataire (T5)

**Principe :** le cœur appelle un contrat ; chaque prestataire l'implémente. Un nouveau prestataire s'ajoute sans modifier le cœur (Odoo : un module `payment_*` par prestataire, `payment_stripe` lu comme exemple).

**Opérations que le cœur demande au prestataire** (Odoo, contenu non lu sauf signatures) :

| Responsabilité | Hook Odoo |
|---|---|
| Préparer le paiement (données spécifiques) | `_get_specific_processing_values` |
| Payer avec un moyen enregistré | `_send_payment_request` |
| Capturer une autorisation | `_send_capture_request` |
| Annuler une autorisation | `_send_void_request` |
| Rembourser | `_send_refund_request` |

**Opérations que le prestataire fournit au cœur à la réception d'une notification** (point d'entrée `_process(provider_code, payment_data)`) :

| Responsabilité | Hook Odoo |
|---|---|
| Retrouver la transaction | `_search_by_reference` |
| Extraire montant et devise | `_extract_amount_data` |
| Appliquer le nouvel état | `_apply_updates` |
| Extraire les données de jeton | `_extract_token_values` |

**Capacités déclarées :** jeton, capture manuelle (complète ou partielle), paiement express, remboursement (aucun, complet, partiel), pays, devises, montant maximum, moyens de paiement.

**Données échangées (déduit, contenu non lu) :**
- Cœur vers prestataire : référence de transaction, montant, devise, client et adresses, jeton éventuel, adresses de retour.
- Prestataire vers cœur : référence, montant, devise, statut, message, identifiant chez le prestataire, données de jeton.

**Événements :** en attente, autorisé, réussi, annulé, erreur ; capture ; annulation d'autorisation ; remboursement.

**Erreurs à prévoir :** refus de paiement, montant ou devise incohérents, notification inconnue ou dupliquée, signature invalide, prestataire injoignable, capacité non supportée.

**Hors contrat (spécifique à un prestataire) :** création d'intents, de clients ou de mandats (exemple Stripe), formulaires de saisie, pages de redirection.

## 8. Frontières

- **Paiement ≠ commande :** le paiement produit des événements ; la commande décide (ECOM-06).
- **Paiement ≠ remboursement métier :** le prestataire exécute le remboursement financier ; la décision et le suivi relèvent d'ECOM-11.
- **Paiement ≠ facture :** facturation automatique possible à la réussite (Odoo : `sale.automatic_invoice`, ECOM-17).
- **Externalisé :** la saisie des données de carte reste chez le prestataire ; la boutique ne stocke jamais de numéro de carte *(principe, non lu dans Odoo)*.
- **Compatibilité :** un prestataire est proposé s'il n'est pas désactivé, appartient à la société, est publié (sauf utilisateur interne), accepte le pays du client (liste vide = tous), et selon la devise et le montant (Odoo : `_get_compatible_providers`, suite non lue). Un rapport explique pourquoi chaque prestataire est écarté : principe à conserver.
- **Virement :** paiement différé géré par le prestataire `custom` d'Odoo ; la transaction reste `pending` jusqu'à validation manuelle (ECOM-12).

## 9. Dépendances

- Entrantes : ECOM-06 (commande à payer), ECOM-03 (montant, devise), ECOM-10 (client, adresses).
- Sortantes : ECOM-06 (événements), ECOM-11 (remboursement), ECOM-14 (notifications), ECOM-15, ECOM-17, ECOM-18 (prestataires), ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Prestataire | `payment` | `payment.provider` |
| Moyen de paiement | `payment` | `payment.method` |
| Transaction et états | `payment` | `payment.transaction`, `_set_*`, `_update_state` |
| Opérations | `payment` | `action_capture`, `action_void`, `action_refund`, `_send_*_request`, `_create_child_transaction` |
| Notification | `payment` | `_process`, `_extract_amount_data`, `_apply_updates` |
| Lien commande | `sale` | `payment_transaction._post_process`, `_check_amount_and_confirm_order` |
| Parcours | `website_sale` | `/shop/payment`, `/shop/payment/transaction/<id>` |
| Exemple de prestataire | `payment_stripe` | surcharges du contrat |

Licences : `payment`, `sale`, `website_sale` et `payment_stripe` en LGPL-3 (vérifié). 21 des 23 modules `payment_*` renvoient LGPL-3 ; 2 sans clé `license` déclarée (`payment_ecpay`, `payment_payu`) : licence à vérifier. Le champ `module_to_buy` (« Odoo Enterprise Module ») indique que certains prestataires peuvent être Enterprise : à vérifier avant toute réutilisation.

## 11. Classement (T6)

- **Socle :** contrat de prestataire, un prestataire actif, moyens de paiement, transaction à 6 états, capture immédiate, notification, virement (paiement différé), mode test.
- **Standard complémentaire :** plusieurs prestataires avec filtres par pays, devise et montant, moyens enregistrés (jetons), capture manuelle, remboursement complet via le prestataire, messages par état.
- **Option avancée :** remboursement partiel, capture partielle, paiement express, prépaiement partiel, validation de moyen sans paiement.

## 12. Points non vérifiés

- Fin de `_update_state` (transition interdite), fin de `_update_source_transaction_state`, `_validate_amount`, `_compute_feature_support_fields`, suite de `_get_compatible_providers`.
- Authentification des notifications ; calcul de `has_pending_refund` (remboursements simultanés).
- Valeurs de `operation`, champs `reference` et `amount`, adresses de retour.
- Licence de `payment_ecpay` et `payment_payu` (clé absente) ; prestataires Enterprise.
- Effet des remboursements sur `amount_paid` (ECOM-06).
