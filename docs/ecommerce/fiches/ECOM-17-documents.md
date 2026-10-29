# ECOM-17 — Documents

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `sale`, `account`, `stock`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Documents du socle : confirmation de commande, facture, bon de livraison, chacun en PDF | Partiel : devis, proforma et facture lus ; bon de livraison : rapport lu, contenu non lu |
| D2 | Une facture émise est figée (numéro, montants, adresses) ; correction par avoir | Partiel : `inalterable_hash` posé seulement si le journal l'exige |
| D3 | Le hash d'inaltérabilité est obligatoire au socle *(proposition)* | Oui : réglage par journal (`restrict_mode_hash_table`) |
| D4 | Numérotation continue, sans trou, par séquence *(proposition)* | Non lu |
| D5 | Le client télécharge ses documents depuis son compte ; sans compte, par jeton (ECOM-16 D4) | Partiel : `download_edi` vu (ECOM-10), PDF non lu |
| D6 | Nom de fichier déterministe, dérivé du type et du numéro | Non : `_get_report_base_filename` |
| D7 | Facture électronique structurée : option avancée | Non lu : `_get_invoice_legal_documents` |
| D8 | Proforma : standard complémentaire | Non : `sale.report_saleorder_pro_forma` |
| D9 | Étiquettes et codes-barres de colis : option avancée | Non : `stock/report` |
| D10 | Conservation légale des documents émis, durée par pays *(proposition)* | Non lu |

## 1. Objectif et périmètre

Produire et rendre accessibles les documents commerciaux et logistiques d'une commande.

Dans le périmètre : confirmation, proforma, facture, avoir, bon de livraison, accès client, nommage, inaltérabilité.

Hors périmètre : envoi par courriel (ECOM-14), droits d'accès (ECOM-16), comptabilité complète, déclarations fiscales.

## 2. Objets métier

- **Document** : rendu figé d'un objet métier (commande, facture, livraison), en PDF.
- **Facture** : document comptable numéroté, émis à partir d'une commande.
- **Avoir** : facture inversée qui corrige une facture émise (ECOM-11 D7).
- **Bon de livraison** : document d'expédition (ECOM-08).
- **Empreinte d'inaltérabilité** : hash qui détecte toute modification d'une facture émise.

## 3. Données

| Objet | Donnée | Statut |
|---|---|---|
| Facture | numéro, date, journal, société | Lu : `name`, `date`, `journal_id`, `company_id` sont les champs hashés (versions 2 à 4) |
| Facture | état : brouillon, émise, annulée | Lu dans le rapport : `draft`, `posted`, `cancel` |
| Facture | empreinte d'inaltérabilité | Lu : `inalterable_hash`, lecture seule, non copiée (l. 355) |
| Facture | PDF émis : nom, type MIME, contenu | Lu : `invoice_pdf_report_id` (l. 6935-6940) |
| Facture | pièces annexes (XML, etc.) | Lu : `_get_invoice_legal_documents_all`, contenu non lu |
| Avoir | type de pièce `out_refund`, même rapport que la facture | Lu : l. 73 à 111 de `report_invoice.xml` |
| Avoir | référence à la facture d'origine | Non lu dans le rapport *(déduit : `reversed_entry`)* |
| Bon de livraison | rapport lié à la livraison, libellé du type d'opération | Lu : `report_deliveryslip.xml:46`, reste non lu |
| Tous | nom de fichier dérivé du type et du numéro | Partiel : `_get_report_base_filename` (l. 6486) |

## 4. États et transitions

| Document | États | Règle |
|---|---|---|
| Facture | brouillon, émise, annulée | Un brouillon n'a ni PDF émis ni hash |
| Facture | émise → annulée | Non lu ; au référentiel, une facture émise se corrige par avoir *(proposition, D2)* |
| Avoir | brouillon, émis, annulé | Mêmes états que la facture (lu dans le rapport) |
| Confirmation, proforma | produits à la demande | Aucun état propre lu |
| Bon de livraison | suit l'état de la livraison (ECOM-08) | Non lu |

Transition clé : le passage à « émise » fige le document. Après ce passage, les champs protégés ne sont plus modifiables si le hash est posé.

## 5. Invariants et règles de validation

1. Une facture non émise ne produit jamais un document « facture » : Odoo renvoie une proforma en repli (l. 6941-6942).
2. Le PDF d'une facture émise est stocké et restitué tel quel, sans nouveau rendu (l. 6935-6940).
3. Si le hash est posé, toute écriture sur les champs protégés ou sur le hash est refusée avec une erreur qui nomme les champs (l. 3943-3949).
4. Le hash n'est ni copié ni modifiable à la main (l. 355).
5. Au socle, toute facture émise porte un hash *(proposition, D3 ; Odoo : selon le journal)*.
6. Un avoir suit les mêmes règles de figement que la facture et passe par les mêmes rapports (l. 73-111).
7. Numérotation unique et continue par séquence *(proposition, D4)*.
8. Les pièces annexes ne sont servies que si le PDF émis existe (l. 6951).
9. Le nom de fichier est déterministe et ne dépend que du type et du numéro *(proposition, D6)*.
10. L'accès aux documents suit ECOM-16 (propriétaire ou jeton), jamais le seul numéro de facture.

## 6. Erreurs et cas particuliers

| Cas | Comportement attendu | Statut |
|---|---|---|
| Modification d'un champ protégé d'une facture hashée | Refus, erreur listant les champs | Lu (l. 3943-3949) |
| Journal sans mode restrictif | Pas de hash, donc facture modifiable | Lu : réglage du journal ; calcul non lu |
| Demande du PDF d'une facture non émise | Proforma si le repli est actif, sinon rien | Lu (l. 6941-6942) |
| Facture émise sans PDF stocké | Comportement à définir | Non lu |
| Lignes de facture modifiées après émission | Protection par sous-champs, liste non lue | Non lu |
| Avoir sur une facture déjà corrigée | Règle à définir (cumul des avoirs) | Non lu *(proposition)* |
| Livraison partielle | Un bon par livraison, pas par commande | Non lu *(proposition)* |
| Changement d'adresse après émission | Sans effet sur la facture émise | *(proposition, D2)* |

## 7. Parcours

| # | Parcours | Étapes |
|---|---|---|
| P1 | Confirmation de commande | Commande confirmée → document de confirmation produit en PDF → accessible au client (ECOM-14 pour l'envoi) |
| P2 | Émission de facture | Facture brouillon → validation → numéro attribué, PDF figé, hash posé *(proposition, D3)* → accessible au client |
| P3 | Correction par avoir | Facture émise erronée → avoir émis, lié à la facture d'origine *(déduit)* → même rendu que la facture |
| P4 | Bon de livraison | Livraison préparée (ECOM-08) → bon produit en PDF → joint au colis ou consultable |
| P5 | Accès client | Client connecté : liste de ses documents. Invité : lien à jeton (ECOM-16 D4) |
| P6 | Proforma | Demande sur commande non facturée → document marqué proforma, jamais présenté comme facture (l. 6941-6942) |

## 8. Frontières

| Sujet | Fiche | Part de cette fiche |
|---|---|---|
| Envoi des documents par courriel | ECOM-14 | Produire le document, pas le transmettre |
| Droits d'accès, jeton | ECOM-16 | Appliquer la règle, ne pas la définir |
| Contenu et état de la livraison | ECOM-08 | Rendre le bon, ne pas gérer la livraison |
| Avoir, remboursement | ECOM-11 | Rendre l'avoir, ne pas décider du remboursement |
| Montants, taxes | ECOM-03 | Afficher les montants, ne pas les calculer |
| Journalisation des émissions | ECOM-19 | Non traité ici |

## 9. Dépendances

- ECOM-06 Commandes : la facture et la confirmation naissent d'une commande.
- ECOM-03 Prix, taxes : montants et taxes figés à l'émission.
- ECOM-08 Livraison : le bon de livraison dépend de la livraison.
- ECOM-11 Retours : l'avoir corrige une facture émise (D7).
- ECOM-10 Comptes clients : accès aux documents depuis le compte.
- ECOM-14 Notifications : envoi des documents.
- ECOM-16 Sécurité : accès par propriétaire ou jeton.

## 10. Correspondance Odoo

| Concept | Élément Odoo 19.0 | Référence |
|---|---|---|
| Confirmation, proforma | `sale.report_saleorder`, `sale.report_saleorder_pro_forma` | `sale/report/ir_actions_report.xml` (`head -10`) |
| Facture PDF | `account.report_invoice`, `account.report_invoice_with_payments` | `account/views/account_report.xml:9, 36` ; gabarit `report_invoice.xml:679` |
| Bon de livraison | `stock.report_deliveryslip` | `stock/report/stock_report_views.xml:18` ; gabarit `report_deliveryslip.xml:318` |
| Nom de fichier | `_get_report_base_filename` | `account_move.py:6486` |
| PDF émis stocké | `invoice_pdf_report_id`, `_get_invoice_legal_documents` | `account_move.py:6925-6942` |
| Pièces annexes | `_get_invoice_legal_documents_all` | `account_move.py:6944-6960` |
| Hash | `inalterable_hash`, `restrict_mode_hash_table` | `account_move.py:353, 355` |
| Champs hashés | `_get_integrity_hash_fields` | `account_move.py:4612-4619` |
| Protection en écriture | `UserError` sur champs hashés | `account_move.py:3943-3949` |
| Avoir | `move_type == 'out_refund'` dans le rapport | `report_invoice.xml:73-111` |

Licence : LGPL-3 pour `sale`, `account`, `stock` (voir L7).

## 11. Classement (T6)

| Capacité | Classe |
|---|---|
| Confirmation de commande en PDF | Socle |
| Facture en PDF, figée à l'émission | Socle |
| Bon de livraison en PDF | Socle |
| Hash d'inaltérabilité *(proposition)* | Socle |
| Avoir rendu comme la facture | Socle |
| Accès client aux documents | Socle |
| Proforma | Standard complémentaire |
| Numérotation continue *(proposition)* | Standard complémentaire |
| Facture électronique structurée | Option avancée |
| Étiquettes et codes-barres de colis | Option avancée |
| Conservation légale par pays *(proposition)* | Option avancée |

## 12. Points non vérifiés

- Contenu du bon de livraison (`report_deliveryslip.xml`) : seuls l'en-tête et l'existence du rapport sont lus.
- Calcul et moment de pose du hash (autour de `account_move.py:1982`).
- Liste des sous-champs de ligne hashés (`line_ids._get_integrity_hash_fields`).
- Lien de l'avoir vers la facture d'origine (`reversed_entry`), non lu dans le rapport.
- Comportement d'une facture émise sans PDF stocké.
- Cumul des avoirs sur une même facture.
- Contenu de `_get_invoice_extra_attachments` et format de la facture électronique.
- Numérotation et continuité des séquences (D4).
- Durées de conservation par pays (D10).
- Propositions non lues : D3, D4, D10.
