# ECOM-18 — Intégrations externes

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `auth_oauth`, `google_recaptcha`, `delivery_mondialrelay`, `sale_gelato`, `website_sale_gelato`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Une intégration externe est une option déclarée par module, jamais implicite au socle | Oui : modules séparés |
| D2 | Captcha : socle (ECOM-16) ; fournisseur remplaçable | Partiel : vérification lue (`ir_http.py:37-118`), clé et seuil par défaut non lus |
| D3 | Connexion externe (OAuth) : option avancée, greffée sur l'inscription (ECOM-10) | Oui : `auth_oauth` dépend de `auth_signup` ; noms de méthodes lus, corps non lus |
| D4 | Point relais : option avancée ; le point est un contact utilisé comme adresse de livraison | Oui : contact enfant du client, `ref` préfixée `MR#`, cohérence transporteur et adresse contrôlée à la confirmation |
| D5 | Impression à la demande : option avancée ; commande envoyée au tiers à la confirmation, seulement si un produit en dépend | Oui |
| D6 | Un produit « tiers » ne se mélange pas avec un produit ordinaire dans une même commande | Oui : refus lu (`sale_order.py:33-50`) ; services et lignes non vendables exemptés |
| D7 | Adresse complète exigée avant tout envoi au tiers ; sinon confirmation refusée avec la liste des champs | Oui |
| D8 | Toute notification entrante est authentifiée par signature avant tout effet *(proposition)* | Partiel : comparaison en temps constant lue, mais secret statique non lié au corps, et recherche de la commande avant vérification |
| D9 | Un échec d'envoi ou de confirmation chez le tiers doit être visible et rejouable, pas seulement tracé *(proposition)* | Non : simple message de fil |
| D10 | Une annulation demandée par un tiers ne touche pas une commande payée ou facturée sans décision humaine *(proposition)* | Non : annulation directe |

## 1. Objectif et périmètre

Définir comment la boutique s'appuie sur des services externes sans en dépendre au socle.

Dans le périmètre : captcha, connexion externe, point relais, impression à la demande, notifications entrantes de tiers.

Hors périmètre : prestataires de paiement (ECOM-07), transporteurs classiques (ECOM-08), envoi de courriels (ECOM-14), flux produit (aucun module trouvé dans `addons/`).

## 2. Objets métier

- **Intégration** : lien déclaré entre la boutique et un service tiers, activable séparément.
- **Notification entrante** : message d'un tiers vers la boutique, authentifié par signature.
- **Point relais** : lieu de retrait, représenté par un contact utilisé comme adresse de livraison.
- **Produit tiers** : produit fabriqué et expédié par un prestataire externe.
- **Commande tiers** : copie de la commande créée chez le prestataire, d'abord en brouillon puis confirmée.
- **Secret d'intégration** : clé d'API ou de signature, réservée à l'administrateur système.

## 3. Données

| Objet | Donnée | Statut |
|---|---|---|
| Produit | identifiant produit chez le tiers `gelato_product_uid` | Lu : testé sur les lignes de commande (`sale_order.py:72`) ; définition non lue |
| Société | clé d'API du tiers `gelato_api_key` | Lu : lue en `sudo` (l. 119) ; définition non lue |
| Société | secret de notification `gelato_webhook_secret`, réservé au groupe système | Lu : `res_company.py:10` |
| Commande | référence envoyée au tiers : identifiant de la commande | Lu (l. 111) |
| Commande | référence client envoyée : « Odoo Partner #id » | Lu (l. 112) |
| Commande | méthode d'expédition : `normal`, `express`, sinon `cheapest` | Lu (l. 106-115) |
| Adresse | ville, pays, courriel, nom, rue ; code postal sauf pays exemptés | Lu (l. 87-89) ; liste des pays exemptés non lue |
| Fichier d'impression | URL absolue de la pièce jointe, avec chaîne de requête | Lu : `product_document.py:24` ; contenu de la requête non lu |
| Point relais | contact avec booléen calculé `is_mondialrelay` | Lu : `res_partner.py:10-15` ; vrai si la référence du contact commence par `MR#` |
| Point relais | recherche ou création du contact à partir de données | Lu : `_mondialrelay_search_or_create` (l. 18-39) ; origine des données non lue |
| Suivi | données de suivi extraites des articles de la notification | Appel lu (l. 73) ; corps non lu |
| Captcha | seuil de score minimal `recaptcha_min_score`, paramètre système | Lu : `res_config_settings.py:13-15` ; valeur par défaut non lue |
| Captcha | clé publique exposée à la page, clé privée | Lu : clé publique ajoutée aux informations de session (`ir_http.py:27`) ; stockage de la clé privée non lu |
| Connexion externe | fournisseur avec point de validation, jeton d'accès de l'utilisateur | Lu : `_auth_oauth_validate` (l. 63-66), calcul de présence du jeton (l. 37) ; champs non lus |

## 4. États et transitions

Commande tiers, côté prestataire :

| État | Déclencheur | Statut |
|---|---|---|
| brouillon | création à la confirmation de la commande boutique | Lu (l. 110) |
| confirmée | après validation de la transaction boutique | Lu (l. 176-184) |
| supprimée | après annulation de la transaction boutique | Lu (l. 125, 197-224) ; échec = message de fil seulement |

Statuts de livraison notifiés par le tiers :

| Statut reçu | Effet côté boutique |
|---|---|
| `failed` | Message dans le fil de la commande |
| `canceled` | Annulation de la commande, puis message |
| `in_transit` | Courriel de suivi via le fil de la commande |
| `delivered` | Courriel de livraison via le fil de la commande |
| `returned` | Message dans le fil, aucun retour ni remboursement |
| autre | Ignoré, réponse vide |

Transition clé : la commande boutique est confirmée avant que la commande tiers le soit. Les deux états peuvent diverger si la confirmation tiers échoue.

## 5. Invariants et règles de validation

1. L'envoi au tiers n'a lieu que si au moins un produit de la commande porte l'identifiant tiers (l. 71-73).
2. L'adresse de livraison est complète avant l'envoi, sinon la confirmation est refusée avec la liste des champs (l. 74-75, 87-99).
3. La commande tiers est créée en brouillon, confirmée après validation de la transaction, supprimée après son annulation, pour éviter les doublons (l. 110, 122-125).
4. Si le tiers refuse la création, la confirmation de la commande boutique échoue avec la référence et le motif (l. 126-132).
5. Une notification entrante est refusée si la société n'a pas de secret (l. 107-112).
6. La signature est comparée en temps constant, et toute différence est refusée (l. 114-116).
7. Le secret est celui de la société de la commande, réservé au groupe système (l. 105-106 ; `res_company.py:10`).
8. La signature reçue est le secret lui-même, sans lien avec le corps ni horodatage *(déduit, l. 106 et 114)*.
9. La signature couvre le corps et un horodatage, pour empêcher le rejeu *(proposition, D8)*.
10. Aucune charge non authentifiée n'est journalisée *(proposition ; Odoo : corps journalisé avant vérification, l. 30)*.
11. Une annulation demandée par le tiers sur une commande payée ou facturée exige une décision humaine *(proposition, D10)*.
12. Un échec de confirmation chez le tiers est signalé activement et peut être rejoué *(proposition, D9)*.
13. Transporteur point relais et adresse point relais vont ensemble : l'un sans l'autre refuse la confirmation (`delivery_mondialrelay/models/sale_order.py:11-17`).
14. Un point relais est un contact enfant du client, retrouvé par référence, rue et code postal, sinon créé ; il n'est pas partagé entre clients (`res_partner.py:18-39`).
15. Un produit tiers ne se mélange pas avec un produit ordinaire ; services et lignes non vendables sont exemptés (`sale_order.py:33-50`).
16. Tout appel sortant a un délai maximal : 10 s vers le prestataire d'impression (`utils.py:32-38`), 2 s vers le service captcha (`ir_http.py:89`).
17. Une vérification captcha en échec (clé invalide, jeton invalide, délai, requête mal formée, score trop bas) refuse la requête (`ir_http.py:53-61`).
18. Le seuil de score captcha est un paramètre système réglable (`res_config_settings.py:13-15`).
19. Une erreur du prestataire n'écrit ni adresse ni autre donnée personnelle dans les journaux *(proposition ; Odoo : charge journalisée, `utils.py:43`)*.

## 6. Erreurs et cas particuliers

| Cas | Comportement attendu | Statut |
|---|---|---|
| Adresse incomplète | Confirmation refusée, champs listés | Lu (l. 74-99) |
| Création refusée par le tiers | Confirmation de la commande boutique bloquée | Lu (l. 126-132) |
| Échec de confirmation après validation | Message de fil seulement ; commande boutique confirmée sans commande tiers confirmée | Lu (l. 185-189) |
| Échec de suppression après annulation | Message de fil seulement ; commande brouillon possiblement orpheline chez le tiers *(déduit)* | Lu (l. 215-219) |
| Secret non défini | Notification refusée, avertissement journalisé | Lu (l. 107-112) |
| Signature invalide | Notification refusée | Lu (l. 114-116) |
| Commande inexistante | Notification refusée | *(déduit : secret vide)* |
| Champ attendu absent du corps | Comportement à lire | Non lu |
| Annulation tiers sur commande payée ou facturée | Annulation directe en superutilisateur | Lu (l. 54) ; conditions de l'annulation non lues |
| Rejeu d'une notification valide | Aucun contrôle lu | Non lu *(déduit)* |
| Statut `returned` | Message seulement, pas de retour ni remboursement (ECOM-11) | Lu (l. 86-93) |
| Charge non authentifiée | Journalisée avant vérification | Lu (l. 29-30) |
| Mélange produit tiers et ordinaire | Refus ; services et lignes non vendables exemptés | Lu (`sale_order.py:33-50`) |
| Prestataire injoignable ou délai de 10 s dépassé | À la création : confirmation bloquée ; après validation (confirmation, suppression) : message de fil seulement | Lu (`utils.py:45-47` ; `sale_order.py:126-132, 185-189, 215-219`) |
| Réponse du prestataire non JSON | Erreur non capturée dans ce qui est lu *(déduit : `response.json()` avant `raise_for_status`)* | Non lu (`utils.py:39-41`) |
| Captcha : clé invalide, jeton invalide, délai, requête mal formée, score trop bas | Requête refusée, un message par cas | Lu (`ir_http.py:53-61`) |
| Service captcha lent (2 s) | Refus avec demande de réessayer | Lu (`ir_http.py:56-57, 93-95`) |
| Point relais : code pays inconnu dans les données | Comportement à lire | Non lu (`res_partner.py:35`) |

## 7. Parcours

| # | Parcours | Étapes |
|---|---|---|
| P1 | Commande à produit tiers | Confirmation → adresse vérifiée → commande tiers créée en brouillon → transaction validée → commande tiers confirmée |
| P2 | Suivi d'expédition | Le tiers notifie `in_transit` → courriel de suivi ; `delivered` → courriel de livraison (ECOM-14) |
| P3 | Échec ou annulation côté tiers | `failed` → message de fil ; `canceled` → annulation de la commande, soumise à décision humaine si payée ou facturée *(proposition, D10)* |
| P4 | Choix d'un point relais | Le client choisit un point (site : contrôleur `website_sale_mondialrelay` ; administration : assistant de choix du transporteur) → contact créé ou retrouvé → adresse de livraison → cohérence contrôlée à la confirmation |
| P5 | Formulaire protégé par captcha | Jeton envoyé avec la requête → vérifié auprès du service (délai 2 s) → score comparé au seuil → requête acceptée ou refusée |
| P6 | Connexion par fournisseur externe | Choix du fournisseur → retour avec jeton d'accès → validation auprès du fournisseur → connexion ou inscription (ECOM-10) *(déduit des noms de méthodes)* |

## 8. Frontières

| Sujet | Fiche | Part de cette fiche |
|---|---|---|
| Prestataires de paiement | ECOM-07 | Non traité ici |
| Transporteurs classiques, livraison | ECOM-08 | Point relais et impression à la demande seulement |
| Inscription, comptes | ECOM-10 | Connexion externe greffée sur l'inscription |
| Retours, remboursements | ECOM-11 | Statut `returned` du tiers sans effet automatique |
| Courriels de suivi | ECOM-14 | Déclencheur seulement |
| Captcha, secrets, droits | ECOM-16 | Appliquer, ne pas définir |
| Journalisation des appels et des charges | ECOM-19 | Points relevés, non traités |
| Délais, paramètres système | ECOM-20 | Non traité ici |

## 9. Dépendances

- ECOM-06 Commandes : la confirmation déclenche l'envoi au tiers.
- ECOM-08 Livraison : le mode d'expédition du tiers vient de la ligne de livraison ; le point relais tient lieu d'adresse.
- ECOM-10 Comptes clients : connexion externe ; le point relais est un contact enfant du client.
- ECOM-11 Retours : statut `returned` notifié par le tiers.
- ECOM-14 Notifications : courriels de suivi et de livraison.
- ECOM-16 Sécurité : captcha, secrets, authentification des notifications.
- ECOM-19 Journalisation : charges et adresses IP écrites dans les logs.

## 10. Correspondance Odoo

| Concept | Module Odoo 19.0 | Référence |
|---|---|---|
| Captcha | `google_recaptcha` | `models/ir_http.py:37-118` ; `models/res_config_settings.py:13-15` |
| Connexion externe | `auth_oauth` | `models/res_users.py:47-152` ; `controllers/main.py:29-154` |
| Point relais | `delivery_mondialrelay` | `models/res_partner.py:10-39` ; `models/sale_order.py:11-17` ; `wizard/choose_delivery_carrier.py:48` |
| Point relais, site | `website_sale_mondialrelay` | `controllers/controllers.py:24` ; licence non lue |
| Commande tiers | `sale_gelato` | `models/sale_order.py:33-224` |
| Appel HTTP du tiers | `sale_gelato` | `utils.py:14-48` |
| Notification entrante | `sale_gelato` | `controlers/main.py:16-116` (dossier ainsi orthographié dans le dépôt) |
| Secret et clé d'API | `sale_gelato` | `models/res_company.py:10` ; `models/sale_order.py:119` |
| Fichier d'impression | `sale_gelato` | `models/product_document.py:24` |

Licence : LGPL-3 pour `auth_oauth`, `google_recaptcha`, `delivery_mondialrelay`, `sale_gelato`, `website_sale_gelato` (voir L7). Non lues : `website_sale_mondialrelay`, `sale_gelato_stock`.

## 11. Classement (T6)

| Capacité | Classe |
|---|---|
| Captcha sur les formulaires publics | Socle |
| Secrets d'intégration réservés à l'administrateur système | Socle |
| Notification entrante authentifiée avant tout effet *(proposition)* | Socle |
| Seuil de score du captcha réglable | Standard complémentaire |
| Connexion par fournisseur externe | Option avancée |
| Point relais | Option avancée |
| Impression à la demande | Option avancée |
| Reprise visible des échecs d'envoi au tiers *(proposition)* | Option avancée |
| Annulation par le tiers soumise à décision humaine *(proposition)* | Option avancée |

## 12. Points non vérifiés

- Captcha : valeur par défaut du seuil, stockage de la clé privée, lignes 96-100 et 109-118 de `ir_http.py`.
- Connexion externe : corps des méthodes et des contrôleurs, notamment `get_state` (protection de la requête de retour), `signin`, `oea` ; délai d'attente de l'appel au fournisseur.
- Point relais : définition de `carrier.is_mondialrelay`, `_can_be_edited_by_current_customer`, origine et validation des données, contrôle du code pays.
- Modules non lus : `website_sale_mondialrelay` (licence), `sale_gelato_stock` (rôle et licence).
- Impression à la demande : `_gelato_prepare_items_payload`, `_gelato_prepare_address_payload`, `_extract_tracking_data`, `COUNTRIES_WITHOUT_ZIPCODE`, stockage de `gelato_api_key` et de `gelato_product_uid`.
- Appels de `_prevent_mixing_gelato_and_non_gelato_products` depuis les lignes de commande : annoncés dans le commentaire, non lus.
- Ligne du décorateur de `_confirm_order_on_gelato`, déduite par symétrie avec la suppression.
- Destinataires des courriels de suivi et contenu du modèle `sale_gelato.order_status_update`.
- Notification : `orderReferenceId` absent ou non numérique, rejeu, suite du traitement `canceled`, conditions de `_action_cancel`.
- Réponse non JSON du prestataire.
- Transporteurs hors `addons/` Community et flux produit : absence constatée par `ls | grep` seulement.
- Propositions non lues : D8, D9, D10, règles 9 à 12 et 19.
