# ECOM-02 — Catégories, navigation et recherche

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3)
**Statut :** décisions validées pour D2, défauts pour les autres, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Une seule taxonomie dans le socle : la catégorie boutique | Oui : Odoo a aussi `product.category` (catégorie interne, `categ_id`), dont le rôle comptable/stock n'a pas été étudié ici |
| D2 | Un produit peut appartenir à plusieurs catégories, dont une principale désignée (fil d'Ariane, URL canonique) | Oui : pas de catégorie principale dans les champs lus |
| D3 | Une catégorie est affichée si elle ou un de ses descendants contient un produit visible | Non : fidèle à `has_published_products` |
| D4 | Pas de limite de profondeur ; aucun cycle autorisé | Non |

## 1. Objectif et périmètre

Organiser le catalogue en arbre de catégories, permettre à un visiteur de parcourir et de rechercher les produits visibles.
Le prix affiché et les promotions relèvent d'ECOM-03 et ECOM-04 ; la mise en page des pages catégorie relève d'ECOM-13.

## 2. Objets métier

| Objet | Rôle | Niveau |
|---|---|---|
| Catégorie | Nœud de l'arbre : nom, parent, ordre | Socle |
| Rattachement produit-catégorie | Lien plusieurs-à-plusieurs avec indication de la catégorie principale | Socle |
| Requête de recherche | Texte, catégorie, tri, page | Socle |
| Filtre | Prix, attributs, tags | Standard complémentaire |
| Tag | Étiquette libre sur les produits (Odoo : `product.tag`) | Standard complémentaire |

## 3. Données

| Donnée | Odoo (`product.public.category`) | Niveau | Remarque |
|---|---|---|---|
| Nom | `name` (required, traduisible) | Obligatoire | Seul champ obligatoire dans Odoo |
| Parent | `parent_id` | Facultatif | Vide = catégorie racine |
| Ordre | `sequence` | Socle | |
| Chemin matérialisé | `parent_path` | Technique | Permet les requêtes de sous-arbre |
| Nom complet | `display_name` calculé « A / B / C » | Dérivé | |
| Produits | `product_tmpl_ids` / `public_categ_ids` (Many2many) | Socle | D2 |
| Catégorie principale du produit | *(absente d'après les champs lus)* | Socle | D2 |
| Image de couverture | `cover_image` | Standard complémentaire | |
| Description, pied de page | `website_description`, `website_footer` | Standard complémentaire | Présentation (ECOM-13) |
| Options d'affichage | `show_category_title`, `show_category_description`, `align_category_content` | Option avancée | ECOM-13 |

## 4. États et statuts

Pas de cycle de vie propre. Statut dérivé :
- **Catégorie visible** = elle ou un descendant contient au moins un produit visible (actif, vendable, publié ; voir ECOM-01).
- Une catégorie vide reste modifiable en administration, mais invisible du public.

## 5. Invariants et règles de validation

1. Une catégorie ne peut pas être son propre ancêtre (Odoo : `check_parent_id`).
2. Le nom est obligatoire.
3. Un produit rattaché à au moins une catégorie a exactement une catégorie principale, choisie parmi les siennes (D2).
4. Retirer la catégorie principale d'un produit impose d'en désigner une autre, ou de vider la liste.
5. Naviguer vers une catégorie affiche les produits de sa sous-arborescence (Odoo : `child_of`).
6. La recherche et la navigation ne portent que sur les produits visibles (même règle que ECOM-01).
7. La visibilité d'une catégorie parente suit celle de ses enfants (D3).

## 6. Erreurs et cas particuliers

- Cycle dans l'arbre : refus.
- Catégorie ou produit supprimé/inaccessible dans une URL : redirection vers la catégorie ou la boutique (Odoo : `handle_product_params_error`).
- Suppression d'une catégorie contenant des produits ou des sous-catégories : comportement Odoo non vérifié, à définir.
- Recherche sans résultat : affichage d'un message, sans erreur.

## 7. Recherche, tri et pagination

- **Champs cherchés (Odoo) :** nom, référence du produit et des variantes, description courte (option).
- **Socle :** recherche texte sur nom et SKU ; tri par ordre d'affichage par défaut (Odoo : `website_sequence asc`), tri modifiable par paramètre ; pagination (Odoo : 20 produits par page, 4 par ligne).
- **Standard complémentaire :** filtre prix min/max, filtres par attribut, tags, autocomplétion (Odoo : module séparé `website_sale_autocomplete`).
- **Point d'attention :** le filtre de prix d'Odoo porte sur `list_price`, pas sur le prix après liste de prix. À traiter en ECOM-03 pour éviter un filtre incohérent avec le prix affiché.
- **Recherche de catégories :** sur le nom, et la description en option.

## 8. Frontières

- **Catégorie ≠ présentation :** l'arbre et le rattachement sont ici ; la mise en page est en ECOM-13.
- **Recherche = mécanisme générique :** Odoo la fournit via un mixin (`website.searchable.mixin`), chaque modèle déclarant ses champs cherchables. À conserver comme principe.
- **Externalisable :** un moteur de recherche externe peut remplacer la recherche native (ECOM-18).
- **SEO / sitemap :** les catégories figurent dans le sitemap d'Odoo, relève d'ECOM-13.

## 9. Dépendances

- Entrantes : ECOM-01 (produit visible).
- Sortantes : ECOM-03 (filtre prix), ECOM-05 (ajout depuis la liste), ECOM-13 (pages catégorie), ECOM-15 (statistiques de recherche).

## 10. Correspondance Odoo

| Capacité | Module | Modèle / mécanisme |
|---|---|---|
| Arbre de catégories | `website_sale` | `product.public.category`, `parent_path`, `check_parent_id` |
| Catégories visibles | `website_sale` | `has_published_products`, `_search_has_published_products` |
| Recherche produit | `website_sale` | `_search_get_detail`, `website.searchable.mixin` |
| Domaine boutique | `website_sale` | `sale_product_domain`, `_get_shop_domain` |
| Tri, pagination | `website_sale` | `shop_default_sort`, `ppg`, `ppr` |
| Tags | `product` | `product.tag` |
| Autocomplétion | `website_sale_autocomplete` | licence non vérifiée |

Licences : `website_sale` est en LGPL-3 (vérifié). `website_sale_autocomplete` et `product.tag` n'ont pas été vérifiés individuellement.

## 11. Classement (T6)

- **Socle :** arbre de catégories, rattachement multiple avec catégorie principale, navigation par catégorie (sous-arbre inclus), recherche texte nom + SKU, tri, pagination, masquage des catégories sans produit visible.
- **Standard complémentaire :** filtres prix et attributs, tags, image de couverture, autocomplétion, tri choisi par le visiteur.
- **Option avancée :** grille à tailles variables (`website_size_x/y`), options d'affichage de catégorie, recherche dans les descriptions de catégories, domaine par site (multi-site).

## 12. Points non vérifiés

- `_get_website_sale_search_fields` (liste exacte des champs cherchés) et `_get_product_sort_mapping` (tris disponibles).
- Sémantique des filtres d'attributs (combinaison ET/OU).
- Usage de `has_published_products` pour masquer les catégories vides dans l'interface.
- Comportement d'Odoo à la suppression d'une catégorie non vide.
- Modèle `product.tag` et licence de `website_sale_autocomplete`.
