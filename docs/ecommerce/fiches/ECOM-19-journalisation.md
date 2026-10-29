# ECOM-19 — Journalisation

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `mail`, `sale`, `base`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Les changements d'état, de montant, de client et de verrouillage d'une commande sont tracés avec auteur et date | Oui : suivi lu sur `state`, `partner_id`, `pricelist_id`, `user_id`, `amount_untaxed`, `amount_total`, `locked`, `team_id` ; taxes et solde à facturer non suivis |
| D2 | Les événements métier et techniques sont deux journaux distincts | Partiel : fil de discussion lu, journal technique non lu |
| D3 | Les décisions de retour et de remboursement sont tracées avec leur auteur *(proposition)* | Non lu : aucun modèle de retour trouvé |
| D4 | La suppression de compte est une demande tracée (`todo`, `done`, `fail`), traitée en différé | Oui : `res.users.deletion`, deux étapes (utilisateur puis contact), l'état `done` est posé dès la première |
| D5 | Une demande de suppression en échec est visible et rejouable *(proposition)* | Non : `fail` sans reprise lue (`search` ne cherche que `todo`) ; échec du contact sans état ni alerte, seulement un `warning` |
| D6 | Les journaux techniques ne contiennent ni donnée personnelle ni charge non authentifiée *(proposition)* | Non : adresse dans la charge (ECOM-18), nom de l'utilisateur et du contact dans les logs de suppression, corps du webhook avant vérification |
| D7 | Un appel sortant ou entrant d'une intégration est tracé sans sa charge utile *(proposition)* | Non : charge journalisée |
| D8 | Durée de conservation des journaux définie par type *(proposition)* | Non lu |
| D9 | Les messages automatiques sont attribués à un auteur technique identifiable | Oui : `partner_root` lu en ECOM-18 |
| D10 | Les traces métier survivent à la suppression de l'utilisateur concerné *(proposition)* | Non lu |

## 1. Objectif et périmètre

Garder une trace fiable de ce qui s'est passé sur une commande, un compte et une intégration, sans exposer de données personnelles.

Dans le périmètre : suivi des champs, fil de discussion, demande de suppression de compte, journaux techniques des intégrations.

Hors périmètre : statistiques (ECOM-15), envoi de courriels (ECOM-14), paramètres et crons d'exploitation (ECOM-20).

## 2. Objets métier

- **Fil de discussion** : historique de messages attaché à un objet (modèle abstrait `mail.thread`).
- **Valeur de suivi** : ancienne et nouvelle valeur d'un champ suivi, liée à un message *(déduit)*.
- **Demande de suppression** : requête de suppression de compte, avec état `todo`, `done` ou `fail`.
- **Journal technique** : sortie de logs du serveur, distincte du fil métier.
- **Auteur technique** : acteur attribué aux messages automatiques.

## 3. Données

| Objet | Donnée | Statut |
|---|---|---|
| Commande | champs suivis : client, liste de prix, vendeur, état, total, hors taxes, verrouillage, équipe | Lu : `sale_order.py:69, 75, 82, 193, 213, 223, 233, 235` |
| Commande | taxes, solde à facturer | Lu : non suivis (l. 234, 236) |
| Suivi | valeur de suivi liée à un message | Lu : `tracking_value_ids` (`mail_thread.py:518`) ; structure non lue |
| Suivi | priorité numérique du suivi (1 à 5) | Lu ; sens non lu |
| Fil | message avec auteur technique `partner_root` | Lu (ECOM-18) |
| Demande de suppression | utilisateur, état `todo`, `done`, `fail`, demandeur (`create_uid`) | Lu : `res_users_deletion.py:20-27, 63` |
| Journal technique | table `ir.logging`, alimentée par SQL hors ORM | Lu : `ir_logging.py:6, 13-17` ; champs non lus |
| Journal technique | fichiers de logs serveur | Lu par leurs appels dans le code ; destination non lue |
| Retour, remboursement | décision et auteur | Non lu : aucun modèle trouvé |

## 4. États et transitions

Demande de suppression de compte :

| État | Déclencheur | Statut |
|---|---|---|
| `todo` | demande créée à la désactivation du compte | Lu (état par défaut non lu) |
| `done` | utilisateur supprimé, ou utilisateur déjà absent | Lu (l. 49-50, 71) |
| `fail` | échec de la suppression de l'utilisateur | Lu (l. 78) |
| `fail` → `todo` | reprise | Non lu : aucune reprise lue |

Étape 2 (contact) : aucun état propre. Un échec laisse la demande à `done`.

## 5. Invariants et règles de validation

1. Un changement de champ suivi crée une valeur de suivi liée à un message *(déduit)*.
2. L'état, le total, le client, le vendeur et le verrouillage d'une commande sont suivis (`sale_order.py:69-235`).
3. Les taxes ne sont pas suivies : une variation de taxes seule n'est pas visible (l. 234).
4. Les messages automatiques ont pour auteur l'auteur technique, jamais un utilisateur (ECOM-18).
5. La suppression d'un compte est différée et traitée par lots de 50 (`res_users_deletion.py:37-56`).
6. Chaque demande est verrouillée avant traitement et ignorée si son état a changé (l. 57-59).
7. La suppression du contact est tentée après celle de l'utilisateur et peut échouer sans changer l'état (l. 85-100).
8. Les échecs de suppression sont journalisés avec l'identifiant, le nom et le demandeur (l. 75-77, 96-98).
9. Le journal technique en base contourne l'ORM : droits et suivi ne s'y appliquent pas (`ir_logging.py:13-17`).
10. Les événements métier passent par le fil, les événements techniques par les logs *(proposition, D2)*.
11. Aucun nom, adresse ni courriel n'est écrit dans un journal technique *(proposition ; Odoo : écrits, voir §6)*.
12. Un appel d'intégration est tracé sans sa charge utile *(proposition, D7)*.
13. Une demande `fail`, ou un contact conservé, est visible et rejouable *(proposition, D5)*.

## 6. Erreurs et cas particuliers

| Cas | Comportement attendu | Statut |
|---|---|---|
| Échec de suppression de l'utilisateur | Annulation, état `fail`, erreur journalisée | Lu (l. 73-78) |
| Échec de suppression du contact | Annulation, avertissement, demande restée `done` | Lu (l. 94-98) |
| Contact lié à une commande | Suppression impossible, contact conservé | Lu (commentaire l. 86) |
| Utilisateur déjà supprimé | Demande passée à `done` | Lu (l. 49-50) |
| Demande `fail` | Aucune reprise automatique | Lu (l. 46) |
| Nom de la personne dans les logs de suppression | Écrit au succès et à l'échec | Lu (l. 68-70, 75-77, 89-98) |
| Adresse de livraison dans l'erreur du prestataire | Écrite dans les logs | Lu (ECOM-18, `utils.py:43`) |
| Corps du webhook avant vérification | Écrit dans les logs | Lu (ECOM-18, `controlers/main.py:30`) |
| Adresse IP lors du captcha | Écrite dans les logs | Lu (ECOM-18, `ir_http.py:94-108`) |
| Modification des taxes d'une commande | Non tracée | Lu (l. 234) |
| Suppression d'un utilisateur auteur de messages | Sort des messages et des valeurs de suivi | Non lu |
| Lecture et purge du journal technique | Droits et durée | Non lu |

## 7. Parcours

| # | Parcours | Étapes |
|---|---|---|
| P1 | Changement d'une commande | Modification d'un champ suivi → message avec ancienne et nouvelle valeur, auteur et date |
| P2 | Message automatique | Événement système ou tiers → message du fil avec l'auteur technique |
| P3 | Suppression de compte | Désactivation → demande `todo` → tâche différée → suppression de l'utilisateur → tentative de suppression du contact → `done` ou `fail` |
| P4 | Reprise d'un échec de suppression | Demande `fail` ou contact conservé → visible de l'administrateur → rejeu *(proposition, D5)* |
| P5 | Incident d'intégration | Erreur d'un tiers → trace sans charge utile *(proposition, D7)* → message visible sur la commande |
| P6 | Consultation du journal technique | Réservée au groupe autorisé ; suppression d'entrées possible pour ce groupe |

## 8. Frontières

| Sujet | Fiche | Part de cette fiche |
|---|---|---|
| Statistiques | ECOM-15 | Non traité ici |
| Courriels | ECOM-14 | Les courriels laissent aussi une trace dans le fil |
| Droits d'accès | ECOM-16 | Droits du journal technique relevés, règle à définir là-bas |
| Comptes, désactivation | ECOM-10 | Demande de suppression décrite ici, parcours client là-bas |
| Retours, remboursements | ECOM-11 | Traçage des décisions seulement |
| Intégrations | ECOM-18 | Points de journalisation repris ici |
| Crons, paramètres, purge | ECOM-20 | Non traité ici |

## 9. Dépendances

- ECOM-06 Commandes : champs suivis.
- ECOM-10 Comptes clients : demande de suppression de compte.
- ECOM-11 Retours : décisions à tracer.
- ECOM-14 Notifications : messages automatiques.
- ECOM-16 Sécurité : droits du journal technique.
- ECOM-18 Intégrations : charges et adresses dans les logs.
- ECOM-20 Exploitation : tâche différée de suppression, purge.

## 10. Correspondance Odoo

| Concept | Élément Odoo 19.0 | Référence |
|---|---|---|
| Fil de discussion | `mail.thread` | `mail/models/mail_thread.py:64, 128-129` |
| Suivi des champs | `_track_prepare`, `_track_finalize`, `_track_get_fields` | `mail_thread.py:527-616` ; corps non lus |
| Champs suivis de la commande | `tracking=` | `sale/models/sale_order.py:69, 75, 82, 193, 213, 223, 233, 235` |
| Demande de suppression | `res.users.deletion` | `odoo/addons/base/models/res_users_deletion.py:20-100` |
| Journal technique | `ir.logging` | `odoo/addons/base/models/ir_logging.py:5-45` |
| Droits du journal | `access_ir_logging` | `odoo/addons/base/security/ir.model.access.csv:120` |

Licence : LGPL-3 pour `mail` et `sale` (voir L7). `base` non lu.

## 11. Classement (T6)

| Capacité | Classe |
|---|---|
| Suivi de l'état, du total, du client et du verrouillage d'une commande | Socle |
| Messages automatiques à auteur technique | Socle |
| Demande de suppression de compte tracée | Socle |
| Journaux techniques sans donnée personnelle *(proposition)* | Socle |
| Suivi des taxes | Standard complémentaire |
| Reprise visible d'une suppression en échec *(proposition)* | Standard complémentaire |
| Traçage des décisions de retour *(proposition)* | Standard complémentaire |
| Durée de conservation par type de journal *(proposition)* | Option avancée |
| Journal technique non supprimable *(proposition)* | Option avancée |

## 12. Points non vérifiés

- Structure de la valeur de suivi, sens des priorités 1 à 5, corps des méthodes `_track_*`.
- Messages d'une commande suivie : droits de lecture par le client, conservation après suppression de l'auteur.
- Sort des messages et valeurs de suivi d'un utilisateur supprimé.
- Fin de `_gc_portal_users` (`commit_progress`, arrêt de lot), usage de `partner` hors suppression, état initial d'une demande.
- Origine des entrées de type `client` dans `ir.logging`, sens de `_allow_sudo_commands`.
- Purge automatique : aucune lue dans deux fichiers du module `mail`, ailleurs non vérifié.
- Modèle de retour ou de remboursement : aucun trouvé (ECOM-11).
- Licence de `base`.
- Propositions non lues : D3, D5, D6, D7, D8, D10, règles 11 à 13.
