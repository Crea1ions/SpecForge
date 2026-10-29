# ECOM-15 — Statistiques

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `sale`, `website_sale`, `digest`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Les statistiques sont lues sur une vue en lecture seule dérivée des commandes, jamais sur les données vivantes | Non : `sale.report`, vue SQL en lecture seule |
| D2 | Socle : ventes par période, produit, catégorie et pays ; nombre de commandes, chiffre d'affaires HT et TTC, quantités | Non : champs de `sale_report.py` |
| D3 | Par défaut, seules les commandes confirmées sont comptées | Partiel : le filtre `confirmed` est dans l'action, pas dans la vue SQL ; le digest exclut `draft`, `cancel`, `sent` |
| D4 | Une moyenne (prix unitaire, remise en %) ne se somme jamais | Non : `aggregator='avg'` |
| D5 | Taux d'abandon et de conversion : indicateurs définis par leur numérateur, leur dénominateur et leur période *(proposition)* | Oui : aucun indicateur de ce nom lu ; seul `is_abandoned_cart` est exposé |
| D6 | Sources de trafic (campagne, média, source) : standard complémentaire | Non : champs UTM du rapport |
| D7 | Suivi des visiteurs et des produits consultés : option avancée, soumis au consentement *(proposition)* | Partiel : `website_visitor.py` lu en partie, consentement non lu |
| D8 | Résumé périodique par courriel : option avancée | Non : `digest`, `kpi_website_sale_total` |
| D9 | Accès réservé au gestionnaire (ECOM-12 D1) | Non : menu réservé à `group_sale_manager` |
| D10 | Les montants sont exprimés dans la devise unique du site (ECOM-03) | Partiel : conversion vers la devise de la société, par ligne (`currency_rate`, table de devises) ; devise unique de la boutique non garantie |

## 1. Objectif et périmètre

Donner à l'équipe une vue chiffrée de l'activité de la boutique : ventes, paniers abandonnés, produits, origine des commandes.

Dans le périmètre : rapport de ventes, indicateurs, filtres et regroupements, résumé périodique, suivi des visiteurs.

Hors périmètre : relance des paniers (ECOM-12, ECOM-14), référencement (ECOM-13), rôles (ECOM-16), journalisation (ECOM-19), outils d'analyse externes (ECOM-18).

## 2. Objets métier

- **Ligne de rapport** : une ligne de commande avec ses dimensions et ses mesures, en lecture seule.
- **Dimension** : axe de regroupement (période, produit, catégorie, client, pays, source).
- **Mesure** : valeur agrégée (quantité, montant, nombre de lignes).
- **Indicateur** : mesure dérivée définie (chiffre d'affaires, taux d'abandon).
- **Visiteur** : session anonyme ou client dont on suit les produits consultés.
- **Résumé périodique** : synthèse envoyée par courriel.

## 3. Données

**Ligne de rapport** (Odoo : `sale.report`, vue SQL en lecture seule)

| Famille | Contenu |
|---|---|
| Dimensions | Référence, date, client, société, liste de prix, équipe, vendeur, statut, statut de facturation, campagne, média, source, pays, région, code postal, catégorie, produit, unité, site |
| Quantités | Commandée, à livrer, livrée, à facturer, facturée |
| Montants | Total HT, total TTC, à facturer, facturé, remise ; poids, volume, nombre de lignes |
| Moyennes | Prix unitaire, remise en % : agrégées par moyenne (D4) |
| Boutique | Site, panier abandonné, catégories boutique |

Les montants sont convertis dans la devise de la société, par ligne.

**Visiteur** (Odoo : `website.visitor`, `website.track`) : client ou session, produits consultés, nombre de produits. Contenu de `website.track` non lu.

**Résumé périodique** (Odoo : `digest`) : indicateur « ventes de la boutique » (somme du HT).

## 4. États et transitions

Aucun état propre : les statistiques sont dérivées.

| Vue | Commandes comptées |
|---|---|
| Écran « Online Sales Analysis » | Site renseigné ; filtre par défaut `confirmed`, retirable |
| Résumé périodique | Site renseigné ; états hors `draft`, `cancel`, `sent` |

## 5. Invariants et règles de validation

1. Une statistique ne modifie jamais une commande (D1 ; Odoo : vue SQL en lecture seule).
2. Seules les commandes rattachées à un site comptent dans les statistiques de la boutique (Odoo : domaine `website_id != False`).
3. Une moyenne n'est jamais sommée (D4).
4. Les montants sont convertis dans la devise de la société avant agrégation (Odoo : `currency_rate`, table de devises).
5. Le résumé périodique exclut les brouillons, annulées et devis envoyés (Odoo : `_compute_kpi_website_sale_total_value`).
6. Un utilisateur sans droit sur les ventes ne reçoit pas l'indicateur du résumé (Odoo : `AccessError` ignoré).
7. Le rapport des ventes de la boutique est réservé au gestionnaire (D9).
8. Un panier abandonné est exposé comme booléen, pas comme taux (D5).
9. Le suivi des visiteurs est soumis au consentement *(proposition, D7)*.

## 6. Erreurs et cas particuliers

- Écart d'Odoo : l'écran filtre sur `confirmed`, le résumé sur « hors brouillon, annulée, envoyée » ; les deux peuvent diverger (états `done`).
- Écart d'Odoo : le filtre d'état est retirable par l'utilisateur ; les chiffres affichés dépendent donc de ses filtres.
- Commande annulée ou remboursée : le remboursement n'apparaît pas dans le rapport lu (ECOM-11).
- Plusieurs sociétés ou devises : conversion par ligne, devise de la société.
- Visiteur sans compte : identifié par session, nom « Website Visitor #id ».

## 7. Parcours

**Odoo Community :**
- Le responsable des ventes ouvre « Online Sales Analysis » : pivot et graphique, commandes confirmées par défaut, regroupements au choix.
- Le résumé périodique envoie l'indicateur des ventes de la boutique aux destinataires du digest.
- Chaque page vue par un visiteur est enregistrée dans `website.track`.

**SpecForge *(proposition)* :**
1. Le gestionnaire choisit une période et un regroupement (D2).
2. Il lit des chiffres calculés sur les commandes confirmées (D3).
3. Il suit les paniers abandonnés et les sources de trafic (D5, D6).
4. Il active, s'il le souhaite, le suivi des visiteurs avec consentement (D7).
5. Il reçoit un résumé périodique (D8).

## 8. Frontières

- **Statistique ≠ donnée vivante :** la statistique est dérivée et en lecture seule (D1).
- **Indicateur ≠ mesure :** un indicateur a un numérateur, un dénominateur et une période (D5).
- **Suivi de visiteur ≠ compte client :** le visiteur peut être anonyme (ECOM-10).
- **Statistique ≠ journalisation :** ECOM-19.
- **Externalisable :** outils d'analyse de trafic tiers (ECOM-18).
- **Permissions :** accès réservé au gestionnaire (D9, ECOM-12, ECOM-16).

## 9. Dépendances

- Entrantes : ECOM-06 (commandes), ECOM-01 (produits, catégories), ECOM-03 (montants, devises), ECOM-12 (paniers abandonnés), ECOM-13 (pages vues), ECOM-10 (visiteurs).
- Sortantes : ECOM-14 (résumé périodique), ECOM-16, ECOM-18.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Rapport de ventes | `sale` | `sale.report`, vue SQL, conversion de devise |
| Dimensions boutique | `website_sale` | `website_id`, `is_abandoned_cart`, catégories boutique |
| Écran d'analyse | `website_sale` | `sale_report_action_dashboard`, pivot et graphique |
| Résumé périodique | `website_sale`, `digest` | `kpi_website_sale_total`, `_compute_kpi_website_sale_total_value` |
| Visiteurs | `website`, `website_sale` | `website.visitor`, `website.track` |
| Consentement | `website` | `website_cookies_bar`, `ir_http.py` |

Licences : `sale`, `website_sale`, `website` en LGPL-3 (vérifié pour `website_sale` et `website`). `digest` non vérifié.

## 11. Classement (T6)

- **Socle :** rapport de ventes en lecture seule, ventes par période, produit, catégorie et pays, commandes confirmées par défaut, accès réservé.
- **Standard complémentaire :** sources de trafic, indicateur de paniers abandonnés, conversion de devise.
- **Option avancée :** suivi des visiteurs, taux de conversion et d'abandon définis, résumé périodique.

## 12. Points non vérifiés

- Écart possible entre le filtre `confirmed` de l'écran et les états comptés par le résumé (`done`).
- Lien entre le consentement aux cookies et la création d'un visiteur.
- Conservation et purge des visiteurs et des pages vues.
- Définition d'un taux de conversion ou d'abandon : aucune trouvée.
- Remboursements et retours dans le rapport.
- Mesures de `website.track` au-delà des champs lus.
- Licence de `digest`.
