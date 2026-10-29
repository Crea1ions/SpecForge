# ECOM-12 — Administration de la boutique

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `website_sale`, `sale`, `sales_team`, `website`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Trois rôles d'administration : gestionnaire de la boutique (tout), opérateur (commandes, clients, retours), éditeur de contenu (pages, catalogue sans prix ni configuration) | Oui : aucun rôle boutique propre ; le vendeur (sans suppression de commande) et le responsable des ventes (tous droits) sont empruntés à `sales_team` |
| D2 | Le catalogue, la configuration et l'intégration sont réservés au gestionnaire | Partiel : le responsable des ventes gère catégories, bandeaux, images ; l'administrateur système gère les flux produit |
| D3 | Commandes impayées et paniers abandonnés sont des vues de suivi, pas des états | Non : filtres d'action (`state = 'sent'`, `is_abandoned_cart`) |
| D4 | Un panier est abandonné s'il est identifié, non vide et plus ancien que le délai du site ; délai en heures par site, défaut 10 | Non : `_compute_abandoned_cart`, `cart_abandoned_delay` (défaut 10.0 ; repli 1.0 si nul) ; l'état requis est `draft` |
| D5 | Un panier d'invité jamais identifié n'est pas relançable | Non (déduit de la condition `partner_id != public`) |
| D6 | Relance d'un panier abandonné par courriel, modèle configurable ; manuelle au socle, automatique en option avancée | Non : `action_recovery_email_send`, `send_abandoned_cart_email` ; un indicateur évite la double relance (`cart_recovery_email_sent`) ; la relance manuelle ouvre l'assistant de courriel (`mail.compose.message`), modèle du site sinon modèle par défaut ; envoi automatique par tâche horaire (`_send_abandoned_cart_email`, corps non lu) |
| D7 | Les clients se gèrent depuis la même console, sans suppression de ceux qui ont des commandes | Partiel : écran client lu, droits non lus |
| D8 | Les valeurs personnalisées saisies par un client ne sont lisibles que par lui et par l'administration | Non : règle `create_uid = user.id` |
| D9 | Actions de masse (publication, archivage, export) : option avancée *(proposition)* | Non lu |

## 1. Objectif et périmètre

Donner à l'équipe de la boutique des écrans et des droits pour suivre les commandes, gérer le catalogue, relancer les paniers abandonnés et administrer les clients.

Dans le périmètre : rôles, menus de gestion, suivi des commandes impayées et des paniers abandonnés, accès aux clients, protection des données saisies par les clients.

Hors périmètre : contenu des pages (ECOM-13), notifications (ECOM-14), statistiques (ECOM-15), matrice complète des permissions (ECOM-16), journalisation (ECOM-19).

## 2. Objets métier

- **Administrateur** : utilisateur interne avec un rôle d'administration.
- **Rôle** : gestionnaire, opérateur ou éditeur de contenu (D1).
- **Console** : ensemble des écrans de gestion : commandes, catalogue, clients, configuration, rapports.
- **Vue de suivi** : filtre sur les commandes, sans état propre (D3).
- **Panier abandonné** : commande identifiée, non vide, dépassant le délai du site.
- **Relance** : courriel envoyé au client d'un panier abandonné.

## 3. Données

**Réglages du site (administration)**

| Champ | Règle |
|---|---|
| Délai d'abandon | Heures ; défaut 10 ; repli 1 si nul |
| Modèle de courriel de relance | Modèle par site, un modèle par défaut est fourni |
| Envoi automatique des relances | Booléen ; date d'activation conservée |

**Commande (champs de suivi)**

| Champ | Règle |
|---|---|
| Panier abandonné | Calculé : site renseigné, état brouillon, date de commande dépassée, client identifié, au moins une ligne |
| Relance envoyée | Booléen ; évite une seconde relance |

**Droits (Odoo : `ir.model.access.csv`)**

| Objet | Écriture complète |
|---|---|
| Catégories boutique, bandeaux, images produit, unités de base | Responsable des ventes |
| Catégories boutique (sans suppression), étapes de caisse | Designer de site |
| Champs supplémentaires de fiche | Éditeur restreint du site |
| Flux produit | Administrateur système (et designer, droits non lus) |

## 4. États et transitions

La console n'ajoute aucun état de commande. Les vues de suivi sont des filtres :

| Vue | Filtre |
|---|---|
| Commandes impayées | État `sent`, site renseigné |
| Paniers abandonnés | `is_abandoned_cart` ; filtre par défaut : relance non envoyée |

**Relance :** non envoyée, puis envoyée (manuellement ou automatiquement). Le retour à « non envoyée » n'est pas lu.

## 5. Invariants et règles de validation

1. Le menu de la boutique n'est visible que pour un vendeur ou plus (Odoo : `group_sale_salesman`).
2. Un panier est abandonné seulement s'il est en brouillon, rattaché à un site, non vide, plus ancien que le délai, et rattaché à un client identifié (D4, D5 ; Odoo : `_compute_abandoned_cart`).
3. Un délai nul vaut 1 heure ; le défaut du réglage est 10 heures.
4. Une relance n'est envoyée qu'une fois par commande (Odoo : `cart_recovery_email_sent`).
5. Les vues impayées et abandonnées ne permettent pas de créer une commande (Odoo : contexte `create: False`).
6. Les visiteurs, le portail et les employés lisent seulement le catalogue publié (ECOM-01, ECOM-16).
7. Un utilisateur du portail ou public ne lit que les valeurs personnalisées qu'il a lui-même saisies (D8 ; Odoo : règle `create_uid = user.id`).
8. Le vendeur et le gestionnaire produit lisent toutes les valeurs personnalisées.
9. Le catalogue boutique est géré par le responsable des ventes ; le designer ne peut pas supprimer (D2 ; Odoo : `1,1,1,0`).
10. Un client avec des commandes ne se supprime pas depuis la console *(proposition, D7)*.

## 6. Erreurs et cas particuliers

- Panier d'un invité jamais identifié : jamais abandonné, donc jamais relancé (D5).
- Panier abandonné devenu commande confirmée : il sort de la vue (l'état n'est plus brouillon).
- Relance sans modèle valide : le comportement n'est pas lu.
- Écart d'Odoo : le repli à 1 heure contredit le défaut de 10 heures du champ.
- Écart d'Odoo : les droits sont répartis entre quatre rôles empruntés ; aucun rôle ne couvre « gérer la boutique » seul (D1).
- Vue « impayées » : ne montre que les devis envoyés, pas les paniers en brouillon (deux vues disjointes).

## 7. Parcours

**Odoo Community :**
- Le vendeur ouvre le menu eCommerce : commandes, commandes impayées, paniers abandonnés, clients.
- Pour un panier abandonné, il lance la relance : l'assistant de courriel s'ouvre avec le modèle du site, un jeton portail est créé.
- Le catalogue boutique, les bandeaux et les images se gèrent par le responsable des ventes.

**SpecForge *(proposition)* :**
1. L'opérateur suit les commandes et les vues de suivi (D3).
2. Il relance un panier abandonné, seul ou en lot ; l'indicateur évite la double relance (D6).
3. Le gestionnaire règle le délai d'abandon et le modèle de relance.
4. L'éditeur de contenu modifie les pages et les fiches sans toucher aux prix ni à la configuration (D1).

## 8. Frontières

- **Panier abandonné ≠ commande impayée :** brouillon identifié contre devis envoyé (D3).
- **Rôle ≠ permission :** la matrice détaillée relève d'ECOM-16.
- **Relance ≠ notification transactionnelle :** la relance est une action de l'administrateur (ECOM-14 pour le reste).
- **Console ≠ contenu :** les pages et menus du site relèvent d'ECOM-13.
- **Externalisable :** relance de paniers et courriels par un outil marketing externe (ECOM-18).
- **Permissions :** un opérateur ne supprime pas de commande ; la suppression est réservée au gestionnaire (Odoo : droits de `sale.order`).

## 9. Dépendances

- Entrantes : ECOM-05 (panier), ECOM-06 (commande), ECOM-10 (client identifié), ECOM-01 (catalogue).
- Sortantes : ECOM-14 (courriel de relance), ECOM-15 (statistiques de paniers), ECOM-16 (permissions), ECOM-19 (journalisation).

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Menus de gestion | `website_sale` | `website_sale_menus.xml`, `menu_ecommerce` |
| Paniers abandonnés | `website_sale` | `_compute_abandoned_cart`, `cart_abandoned_delay`, `action_view_abandoned_tree` |
| Commandes impayées | `website_sale` | `action_view_unpaid_quotation_tree` |
| Relance | `website_sale` | `action_recovery_email_send`, `_get_cart_recovery_template`, `cart_recovery_email_sent` |
| Droits sur les commandes | `sale` | `ir.model.access.csv` (vendeur, responsable) |
| Droits du catalogue | `website_sale` | `ir.model.access.csv`, `ir_rules.xml` |
| Valeurs personnalisées | `website_sale` | règle `product_attribute_custom_value_portal_rule` |

Licences : `website_sale` et `sale` en LGPL-3 (vérifié pour `website_sale`) ; `sale` non vérifié ici.

## 11. Classement (T6)

- **Socle :** trois rôles, menus de gestion, vue des commandes impayées et des paniers abandonnés, délai d'abandon, relance manuelle, protection des valeurs personnalisées.
- **Standard complémentaire :** relance en lot, modèle de relance par site, gestion des clients depuis la console.
- **Option avancée :** relance automatique, actions de masse, console multi-sites.

## 12. Points non vérifiés

- Corps de `_send_abandoned_cart_email` (cron horaire lu) ; effet de `website_sale_send_recovery_email` sur `cart_recovery_email_sent`.
- Retour de la relance à « non envoyée ».
- Comportement d'une relance sans modèle valide.
- Droits sur les clients et sur `product_feed` (tronqués).
- Contenu de `action_orders_ecommerce`.
- Licence de `sale` et `sales_team`.
- Rôle exact du designer de site sur les produits.
