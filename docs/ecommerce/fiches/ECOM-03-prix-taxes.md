# ECOM-03 — Prix et taxes

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `product`, `website_sale`, `account`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Socle : un prix unique par produit, une seule devise, sans liste de prix | Oui : Odoo calcule toujours via une liste de prix |
| D2 | Montants en décimal exact ou en unités mineures (centimes), jamais en flottant | Oui : `list_price` est un `Float` dans Odoo |
| D3 | Socle : une taxe par produit (taux), mode HT ou TTC réglé au niveau boutique | Partiel : Odoo permet plusieurs taxes par produit et un mode par taxe (`price_include_override`) |
| D4 | Le prix affiché est la source unique : filtre prix et tri par prix portent sur lui | Oui : Odoo filtre et trie sur `list_price` (corrige le point d'attention d'ECOM-02) |
| D5 | Le prix appliqué à une commande est figé à sa création | À vérifier en ECOM-06 |
| D6 | Les règles de prix par catégorie portent sur la catégorie boutique | Oui : Odoo utilise `product.category` (interne), écartée par ECOM-02 D1 |

## 1. Objectif et périmètre

Définir comment le prix d'un produit est déterminé, avec quelles taxes, et comment il est affiché.
Les remises par coupon ou règle de panier relèvent d'ECOM-04. Le total du panier relève d'ECOM-05.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Prix catalogue | Prix de vente unitaire du produit (ECOM-01) | Socle |
| Taxe | Taux appliqué au produit (TVA) | Socle |
| Mode d'affichage | HT ou TTC | Socle |
| Devise | Monnaie de la boutique | Socle |
| Prix barré | Ancien prix affiché à titre de comparaison | Standard complémentaire |
| Liste de prix | Ensemble de règles de prix (période, quantité, cible) | Standard complémentaire |
| Règle de prix | Prix fixe, pourcentage ou formule sur un produit ou une catégorie | Standard complémentaire |
| Position fiscale | Remplacement de taxes selon le pays ou le client | Standard complémentaire |
| Multi-devise, liste par groupe de pays | | Option avancée |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Prix catalogue | `list_price` (Float, défaut 1.0) | Obligatoire, ≥ 0 | D2 ; ECOM-01 D4 |
| Prix barré | `compare_list_price` | Facultatif | Odoo : actif seulement si `group_product_price_comparison` |
| Taxes de vente | `taxes_id` (many2many) | Obligatoire (une en socle) | D3 |
| Taxes d'achat | `supplier_taxes_id` | Hors périmètre | Achats non traités |
| Type de taxe | `type_tax_use` (défaut `sale`) | Fixe : vente | |
| Calcul de taxe | `amount_type` (défaut `percent`) | Fixe : pourcentage | Autres types : option avancée |
| Prix TTC / HT | `price_include` (calculé : `price_include_override` ou réglage société) | Réglage boutique | D3 |
| Taxes en cascade | `include_base_amount` | Option avancée | |
| Affichage HT/TTC | `website.show_line_subtotals_tax_selection` | Réglage boutique | Seule la branche `tax_excluded` a été lue |
| Devise | `currency_id` (liste de prix, site) | Une seule en socle | |
| Liste de prix | `product.pricelist` : `name`, `active`, `sequence`, `currency_id`, `country_group_ids`, `item_ids` | Standard complémentaire | |
| Règle de prix | `product.pricelist.item` : `date_start`/`date_end`, `min_quantity`, `applied_on`, `compute_price`, `fixed_price`, `percent_price`, `price_discount`, `price_surcharge`, `price_markup`, `price_round`, marges min/max, `base_pricelist_id` | Standard / avancé | Cibles : produit, template ou catégorie (D6) |

## 4. Règle de calcul du prix affiché

1. Prix de base = prix catalogue.
2. Socle : aucune règle, prix de base.
3. Standard complémentaire : on applique la **première règle** de la liste de prix applicable (période, quantité, cible), qui renvoie un prix et la règle retenue (Odoo : `_compute_price_rule`).
4. Les taxes sont appliquées au prix obtenu, après remplacement éventuel par la position fiscale (`map_tax`) ; le prix affiché est HT ou TTC selon le réglage boutique.
5. **Prix barré :** si la règle retenue affiche sa remise et que le prix avant remise dépasse le prix remisé, c'est ce prix qui est barré ; sinon, `compare_list_price` si l'option est active (Odoo : `_show_discount_on_shop`).

**Point d'attention :** en liste de produits, Odoo calcule le prix avec une quantité de 1. Les paliers de quantité n'y apparaissent pas.

## 5. Invariants et règles de validation

1. Prix catalogue ≥ 0 (ECOM-01 D4).
2. Un produit publiable a un prix et une taxe de vente définis.
3. Un prix barré n'a de sens que s'il est supérieur au prix affiché.
4. Une règle de prix a une période cohérente (Odoo : contrainte sur `date_start`/`date_end`, contenu non lu).
5. Une liste de prix ne peut pas dépendre d'elle-même, directement ou indirectement (Odoo : contraintes sur `base_pricelist_id`, contenu non lu, supposé anti-boucle).
6. Marges min/max cohérentes (Odoo : contrainte `price_min_margin`/`price_max_margin`, contenu non lu).
7. Une règle vise un seul niveau : produit, template ou catégorie (Odoo : contrainte sur `product_id`, `product_tmpl_id`, `categ_id`, contenu non lu).
8. Une taxe est unique par société, nom, usage, portée et pays (Odoo : `account_tax.py:231`).
9. Les montants sont arrondis selon la devise.
10. Le prix d'une ligne de commande ne change pas après création (D5, à vérifier).

## 6. Erreurs et cas particuliers

- Produit sans taxe : refus de publication (règle 2). Comportement Odoo non vérifié.
- Plusieurs règles applicables : la première retenue l'emporte. L'ordre de tri des règles n'a pas été lu.
- Changement de devise ou de liste en cours de panier : à traiter en ECOM-05.
- Taxes différentes selon le pays du client : position fiscale (standard complémentaire).
- Prix barré converti de devise sans taxes (Odoo, `_get_sales_prices` lignes 433-440) : possible incohérence d'affichage TTC/HT, à confirmer. Ne pas reprendre sans vérification.

## 7. Frontières

- **Prix ≠ promotion :** une règle de prix modifie le prix de base ; un coupon ou une règle de panier relève d'ECOM-04 (Odoo : module `loyalty`, mécanisme distinct).
- **Prix ≠ comptabilité :** la taxe est définie dans `account` (module comptable complet). SpecForge n'a besoin que du taux et du mode HT/TTC. Comptes, déclarations et localisations fiscales sont hors périmètre.
- **Externalisable :** le calcul de taxe (TVA, destination dans l'UE) peut être confié à un service externe (ECOM-18).
- **Affichage ≠ calcul :** le mode HT/TTC est un réglage de présentation ; le calcul garde le prix HT et la taxe.

## 8. Dépendances

- Entrantes : ECOM-01 (produit, prix catalogue), ECOM-02 (catégories, pour les règles par catégorie).
- Sortantes : ECOM-04, 05, 06, 08 (frais de port taxés), 11 (remboursement), 17 (factures).

## 9. Correspondance Odoo

| Capacité | Module | Modèle / mécanisme |
|---|---|---|
| Prix catalogue | `product` | `list_price`, `compare_list_price` |
| Listes et règles de prix | `product` | `product.pricelist`, `product.pricelist.item`, `_compute_price_rule` |
| Prix affiché | `website_sale` | `_get_sales_prices`, `_apply_taxes_to_price` |
| Taxes | `account` | `account.tax`, `taxes_id`, `price_include`, `include_base_amount` |
| Position fiscale | `account` / `website_sale` | `account.fiscal.position`, `_get_and_cache_current_fiscal_position` |
| Affichage HT/TTC | `website_sale` | `show_line_subtotals_tax_selection` |

Licences : `product`, `website_sale` et `account` sont en LGPL-3 (vérifié). `account` est un module très volumineux ; ne pas envisager sa réutilisation sans étude (L7).

## 10. Classement (T6)

- **Socle :** prix catalogue, une devise, une taxe de vente par produit, réglage HT/TTC, arrondi, affichage du prix avec taxes.
- **Standard complémentaire :** prix barré, listes et règles de prix (période, quantité, produit ou catégorie, prix fixe ou pourcentage), plusieurs taxes par produit, positions fiscales, prix par unité de mesure.
- **Option avancée :** multi-devise, listes par groupe de pays, règles en cascade (`base_pricelist_id`), formules avec marges, taxes en cascade (`include_base_amount`), autres types de calcul de taxe.

## 11. Points non vérifiés

- Valeurs des listes `applied_on`, `base` et `compute_price`, contenu des contraintes 316, 321, 354, 366 et 371, ordre de tri des règles (`_order`).
- Sélection de la liste de prix applicable à un visiteur (`get_pricelist_available`) et rôle de `country_group_ids`.
- `_show_discount_on_shop`, `_apply_taxes_to_price` et la condition de `show_line_subtotals_tax_selection`.
- Lien produit / taxe par défaut (`account/models/product.py:155`, `taxes_id = False`) et champ calculé de la ligne 107.
- Données fiscales françaises (`l10n_fr`), non lues.
- Gel du prix à la commande (D5) : voir ECOM-06.
