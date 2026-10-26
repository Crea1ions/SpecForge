# ECOM-01 — Catalogue et gestion des produits

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3)
**Statut :** décisions par défaut retenues, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Socle : un produit = un SKU (pas de couche template/variante) | Oui : Odoo sépare `product.template` et `product.product` |
| D2 | SKU obligatoire et unique | Oui : `default_code` est indexé mais non unique |
| D3 | Publiable = nom + SKU + prix + au moins une image | Oui : Odoo n'impose aucune complétude |
| D4 | Prix catalogue ≥ 0 | Oui : pas de contrainte dans `product` |
| D5 | Publication = statut global (multi-site en option avancée) | Oui : Odoo publie par site (`website.published.multi.mixin`) |

## 1. Objectif et périmètre

Décrire un produit physique simple, de sa création à son archivage, et définir quand il est vendable, publiable et visible.
Prix (ECOM-03), catégories (ECOM-02) et stock (ECOM-09) sont détaillés dans leurs fiches. Ici ne figurent que les liens.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Produit | Unité vendable : identité, description, prix catalogue, statut | Socle |
| Média | Images du produit (une principale + galerie) | Socle |
| Catégorie | Rattachement catalogue (→ ECOM-02) | Socle |
| Variante / attribut | Déclinaisons (taille, couleur) | Standard complémentaire |
| Produit lié | Alternatifs et accessoires | Standard complémentaire |
| Combo | Lot de produits à choix | Option avancée |

## 3. Données

| Donnée | Odoo | Niveau | Remarque |
|---|---|---|---|
| Nom | `name` (required) | Obligatoire | |
| Type | `type` (required, défaut `consu`) | Fixe : bien physique | Services et combos hors socle |
| Référence (SKU) | `default_code` | Obligatoire, unique | D2 |
| Code-barres | `barcode` | Facultatif, unique | Odoo : unicité par société, étendue aux conditionnements |
| Prix catalogue | `list_price` (défaut 1.0) | Obligatoire, ≥ 0 | D4 ; détail en ECOM-03 |
| Prix barré | `compare_list_price` | Facultatif | Standard complémentaire |
| Description courte / longue | `description_sale` / `description_ecommerce` | Facultatif | |
| Images | `image_1920`, `product_template_image_ids` | ≥ 1 pour publier | D3 |
| Catégorie | `categ_id` (interne), `public_categ_ids` (boutique) | Facultatif | Deux taxonomies dans Odoo, voir ECOM-02 |
| Poids, volume | `weight`, `volume` | Facultatif | Requis en pratique si livraison au poids (→ ECOM-08) |
| Unité de mesure | `uom_id` | Fixe : unité | |
| Prix à l'unité | `base_unit_*` | Option avancée | Prix au kilo/litre |
| Actif | `active` | Oui | Archivage |
| Vendable | `sale_ok` (défaut True) | Oui | |
| Publié | `is_published` (défaut False, `copy=False`) | Oui | D5 |
| Date de publication | `publish_date` | Option avancée | |
| Ordre d'affichage | `website_sequence` | Standard complémentaire | |

## 4. Statuts

Trois indicateurs indépendants :

| Indicateur | Sens |
|---|---|
| actif | Faux = archivé : ni visible ni achetable |
| vendable | Faux = ne peut pas être commandé |
| publié | Faux = absent de la boutique |

Statuts dérivés (non stockés) :
- **Visible en boutique** = actif ∧ vendable ∧ publié.
- **Achetable** = visible ∧ disponible (stock, ECOM-09).
- **Épuisé** = produit suivi en stock ∧ vente hors stock interdite ∧ stock disponible ≤ 0.

Dans Odoo, « achetable » (`_can_be_added_to_cart` : `sale_ok`, `active`, combinaison valide) et « visible » (`sale_product_domain` : `sale_ok`, `is_published`, société) sont deux règles distinctes. En statut global, la publication est retenue aussi pour l'achat public, ce qui simplifie sans changer le comportement visible.

Cycle de vie : `Brouillon (actif, non publié)` → `Publié` ⇄ `Dépublié` → `Archivé`.
La duplication d'un produit produit un brouillon.

## 5. Invariants et règles de validation

1. Un produit dupliqué n'est jamais publié (Odoo : `copy=False`).
2. Publier exige le droit de publier (→ ECOM-16). Odoo lève `AccessError` sinon.
3. Code-barres unique, SKU unique (D2).
4. Prix ≥ 0 (D4).
5. Publiable = nom, SKU, prix et au moins une image renseignés (D3).
6. Archiver un produit le retire de la boutique ; les commandes passées restent lisibles.
7. Un produit lié (alternatif ou accessoire) n'est proposé que s'il est lui-même visible.

## 6. Erreurs et cas particuliers

- Publication sans droit : refus.
- Publication d'une fiche incomplète : refus avec la liste des champs manquants.
- Code-barres ou SKU en doublon : refus avec le produit en conflit.
- Archivage d'un produit présent dans des paniers ouverts : à traiter en ECOM-05.

## 7. Frontières

- **Produit ≠ stock :** le produit déclare s'il est suivi en stock (Odoo : `is_storable`, défini dans `stock`). Les quantités relèvent d'ECOM-09.
- **Politique de vente en rupture :** dans Odoo (`website_sale_stock`), `allow_out_of_stock_order` (défaut True), `available_threshold` (5.0), `show_availability` et `out_of_stock_message` sont portés par le produit mais relèvent de la disponibilité (ECOM-09).
- **Vendable ≠ publié :** vendable autorise la transaction, publié autorise l'exposition.
- **Prévisualisation :** dans Odoo, les utilisateurs internes voient les produits non publiés. Règle de permission, à traiter en ECOM-16.
- **Externalisable :** flux produits vers comparateurs (Odoo : `product_feed`) → ECOM-18.

## 8. Dépendances

- Entrantes : aucune (premier domaine).
- Sortantes : ECOM-02, 03, 05, 06, 08, 09, 13, 17.

## 9. Correspondance Odoo

| Capacité | Module | Modèle / mécanisme |
|---|---|---|
| Fiche produit | `product` | `product.template` / `product.product` |
| Publication | `website` | `website.published.multi.mixin` |
| Présentation boutique | `website_sale` | `description_ecommerce`, `public_categ_ids`, `sale_product_domain` |
| Suivi stock | `stock` | `is_storable` |
| Disponibilité web | `website_sale_stock` | `_is_sold_out`, `_get_max_quantity` |

Licences : `product`, `sale`, `stock`, `payment`, `delivery`, `website_payment`, `loyalty`, `website_sale_stock` et `website_sale` sont en LGPL-3 (vérifié dans les manifestes). Les autres modules `website_sale_*` n'ont pas été vérifiés. La conception s'inspire des mécanismes sans copier de code ; toute réutilisation directe se décidera dans L7.

## 10. Classement (T6)

- **Socle :** fiche, SKU, prix, images, statuts actif/vendable/publié, archivage.
- **Standard complémentaire :** variantes, produits alternatifs/accessoires, prix barré, ordre d'affichage.
- **Option avancée :** combos, prix à l'unité, publication planifiée, publication multi-site, flux comparateurs.

## 11. Points non vérifiés

- `website.website_domain()` (module `website`) non lu : sans effet en statut global, à lire si le multi-site est étudié.
- Checkout Odoo « grafted » : pas d'historique Git exploitable.
