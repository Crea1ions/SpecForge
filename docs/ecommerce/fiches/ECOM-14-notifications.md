# ECOM-14 — Notifications

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `sale`, `website_sale`, `auth_signup`, `mail`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Une notification associe un événement métier, un modèle, un destinataire et un canal ; le courriel est le canal du socle | Partiel : modèles `mail.template` retrouvés par `env.ref` dans les méthodes |
| D2 | Socle : confirmation de commande, paiement reçu, création de compte, mot de passe | Non : modèles de `sale` et `auth_signup` |
| D3 | Le modèle de confirmation est réglable par site | Non : `website.py:54` |
| D4 | Expédition, livraison, retour et remboursement : standard complémentaire *(proposition)* | Non lu : aucun modèle trouvé dans les fichiers lus |
| D5 | Un courriel transactionnel ne part pas pour une commande annulée *(proposition)* | Oui : « paiement reçu » part même sur une commande annulée (ECOM-06 §6) |
| D6 | Relance de panier : manuelle au socle ; automatique par tâche horaire en option avancée | Non : cron horaire `_send_abandoned_cart_email` ; utilise toujours le modèle par défaut, pas celui du site |
| D7 | Les envois différés passent par une file avec reprise *(proposition)* | Non : `pending_email_template_id` et cron quotidien `_cron_send_pending_emails`, activé par le paramètre `sale.async_emails` |
| D8 | Envoi automatique de la facture : option avancée | Non : `_cron_send_invoice`, quotidien |
| D9 | Chaque envoi est tracé : événement, destinataire, résultat *(proposition)* | Non lu |
| D10 | Canaux autres que le courriel : option avancée | Non lu |

## 1. Objectif et périmètre

Informer le client et l'équipe des événements de la boutique, avec des messages cohérents et traçables.

Dans le périmètre : événements, modèles, déclencheurs, destinataires, envois différés, relance de panier.

Hors périmètre : contenu des pages (ECOM-13), règles de relance (ECOM-12), documents joints (ECOM-17), journalisation générale (ECOM-19).

## 2. Objets métier

- **Événement** : fait métier qui déclenche un message (commande confirmée, paiement reçu).
- **Modèle de message** : sujet et corps paramétrés par l'objet concerné.
- **Notification** : envoi d'un modèle à un destinataire par un canal.
- **Destinataire** : client, invité ou administrateur.
- **Envoi différé** : notification mise en attente puis envoyée par une tâche.

## 3. Données

**Modèle de message** (Odoo : `mail.template`)

| Champ | Règle |
|---|---|
| Nom, objet, corps | Paramétrés par l'objet concerné ; l'objet de la confirmation dépend de l'état du dernier paiement |
| Destinataires | Par défaut, ceux du modèle ; à défaut, le courriel du client |

**Modèles fournis (lus)**

| Modèle | Module | Usage |
|---|---|---|
| Devis ou commande | `sale` | Envoi du devis ou de la commande |
| Proforma | `sale` | Envoi du proforma |
| Confirmation de commande | `sale` | Réglable par site |
| Paiement reçu | `sale` | Après paiement engagé |
| Relance de panier | `website_sale` | Panier abandonné |
| Invitation, création de compte, mot de passe | `auth_signup` | Quatre modèles |

**Commande (champs de notification)**

| Champ | Règle |
|---|---|
| Modèle en attente | Renseigné quand l'envoi est différé ; effacé après envoi |
| Relance envoyée | Booléen (ECOM-12) |

**Réglages**

| Réglage | Règle |
|---|---|
| Envoi différé | Paramètre système `sale.async_emails` ; inactif par défaut |
| Relance automatique | Par site, avec date d'activation |
| Modèle de confirmation, modèle de relance | Par site |

## 4. États et transitions

**Notification d'une commande :** à envoyer, en attente, envoyée.

| De | Vers | Déclencheur |
|---|---|---|
| à envoyer | envoyée | Envoi immédiat (mode par défaut) |
| à envoyer | en attente | Envoi différé activé |
| en attente | envoyée | Tâche quotidienne |

**Relance de panier :** non envoyée, puis envoyée, y compris pour un panier écarté par le filtre (marqué envoyé sans courriel).

## 5. Invariants et règles de validation

1. Sans modèle, aucun envoi et aucune erreur (Odoo : `_send_order_notification_mail`).
2. Avec l'envoi différé, le modèle est mémorisé et la tâche l'envoie, puis l'efface (Odoo : `pending_email_template_id`).
3. La tâche différée s'arrête au bout du temps imparti et reprend au passage suivant (Odoo : `_commit_progress`).
4. Le courriel « paiement reçu » est envoyé sans contrôle de l'état de la commande (Odoo : `_send_payment_succeeded_for_order_mail`) ; D5 l'interdit pour une commande annulée.
5. Le modèle de confirmation est celui du site, sinon celui par défaut (D3).
6. La relance automatique ne vise que les paniers abandonnés, non relancés, postérieurs à l'activation de l'option, du site concerné.
7. Un panier écarté par le filtre est marqué relancé sans courriel.
8. La relance automatique sans destinataire sur le modèle utilise le courriel du client.
9. Une relance n'est envoyée qu'une fois par commande.

## 6. Erreurs et cas particuliers

- Écart d'Odoo : la relance automatique utilise le modèle par défaut, la relance manuelle celui du site.
- Écart d'Odoo : l'indicateur de relance est posé après l'envoi sans gestion d'échec visible ; un échec d'envoi n'est pas traité dans le code lu.
- Paniers antérieurs à l'activation de la relance : jamais relancés.
- Envoi différé : le client peut attendre jusqu'à un jour pour la confirmation.
- Écart d'Odoo : aucun modèle de livraison, retour ou remboursement dans les fichiers lus (D4).
- « Paiement reçu » sur une commande annulée : envoyé par Odoo, interdit par D5.

## 7. Parcours

**Odoo Community :**
- À la confirmation, le client reçoit le courriel de confirmation ; après un paiement engagé, le courriel « paiement reçu ».
- Si l'envoi différé est activé, ces courriels partent par une tâche quotidienne.
- Pour un panier abandonné, la relance part à la main ou par une tâche horaire.
- À l'inscription ou à la réinitialisation, `auth_signup` envoie ses modèles.

**SpecForge *(proposition)* :**
1. L'événement métier se produit (commande confirmée, paiement reçu).
2. Le système choisit le modèle (celui du site, sinon celui par défaut).
3. Il vérifie que la commande n'est pas annulée (D5).
4. Il envoie le message ou le met en attente (D7).
5. Il trace l'envoi (D9).
6. Les notifications d'expédition, de retour et de remboursement s'ajoutent en standard complémentaire (D4).

## 8. Frontières

- **Notification ≠ document :** le message informe, la facture ou le bon de livraison est un document (ECOM-17).
- **Relance ≠ message transactionnel :** la relance est marketing, sans obligation légale (ECOM-12).
- **Modèle ≠ envoi :** le modèle décrit, l'envoi est tracé séparément (D9).
- **Notification ≠ journalisation :** ECOM-19.
- **Externalisable :** envoi par un service de courriel tiers, SMS (ECOM-18).
- **Permissions :** l'édition des modèles est réservée au gestionnaire (ECOM-12).

## 9. Dépendances

- Entrantes : ECOM-06 (confirmation), ECOM-07 (paiement), ECOM-08 (expédition), ECOM-10 (comptes), ECOM-11 (retours, remboursements), ECOM-12 (relance).
- Sortantes : ECOM-17 (pièces jointes), ECOM-18 (service d'envoi), ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Modèles de courriel | `sale`, `website_sale`, `auth_signup`, `stock` | `mail.template` |
| Envoi d'une notification de commande | `sale` | `_send_order_notification_mail`, `_get_confirmation_template` |
| Paiement reçu | `sale` | `_send_payment_succeeded_for_order_mail` |
| Envoi différé | `sale` | `pending_email_template_id`, `_cron_send_pending_emails`, `sale.async_emails` |
| Relance automatique | `website_sale` | `_send_abandoned_cart_email`, `_filter_can_send_abandoned_cart_mail` |
| Facture automatique | `sale` | `_cron_send_invoice` |

Licences : `sale`, `website_sale`, `auth_signup` en LGPL-3 (vérifié). `mail` et `stock` non vérifiés ici.

## 11. Classement (T6)

- **Socle :** confirmation de commande, paiement reçu, création de compte, mot de passe, modèle par site.
- **Standard complémentaire :** expédition, livraison, retour, remboursement, traçabilité des envois, relance manuelle.
- **Option avancée :** envoi différé, relance automatique, facture automatique, SMS et autres canaux.

## 12. Points non vérifiés

- Fin de `_filter_can_send_abandoned_cart_mail` (règle du panier le plus récent par client).
- Valeur par défaut de `sale.async_emails`.
- Modèle de `stock` : contenu et déclencheur.
- Modèle de remboursement ou de retour : aucun trouvé.
- Échec d'envoi : traitement et reprise.
- Désinscription et préférences de notification.
- Corps des modèles, langue du message.
- `_cron_send_invoice` : corps non lu.
- Licences de `mail` et `stock`.
