# ECOM-02 — Catégories, navigation et recherche

**Version :** 0.2 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3)
**Statut :** décisions validées pour D2, défauts pour les autres, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Une seule taxonomie dans le socle : la catégorie boutique | Oui : Odoo a aussi `product.category` (catégorie interne, `categ_id`), dont le rôle comptable/stock n'a pas été étudié ici |
| D2 | Un produit peut appartenir à plusieurs catégories, dont une principale désignée (fil d'Ariane, URL canonique) | Oui : pas de catégorie principale dans les champs lus |
| D3 | Une catégorie est affichée si elle ou un de ses descendants contient un produit visible | Non : fidèle à `has_published_products` |
| D4 | Pas de limite de profondeur ; aucun cycle autorisé | Non |
| D5 | Suppression d'une catégorie refusée tant qu'elle contient des sous-catégories ou des produits | Oui : `parent_id` est en `ondelete='cascade'` (les sous-catégories sont supprimées avec leur parent) |

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
- Une catégorie sans produit visible reste modifiable en administration, mais invisible du public : Odoo filtre les sous-catégories (`children.filtered('has_published_products')`) et le méga-menu pour les non-internes ; les utilisateurs internes voient tout (prévisualisation, → ECOM-16).

## 5. Invariants et règles de validation

1. Une catégorie ne peut pas être son propre ancêtre (Odoo : `check_parent_id`).
2. Le nom est obligatoire.
3. Un produit rattaché à au moins une catégorie a exactement une catégorie principale, choisie parmi les siennes (D2).
4. Retirer la catégorie principale d'un produit impose d'en désigner une autre, ou de vider la liste.
5. Naviguer vers une catégorie affiche les produits de sa sous-arborescence (Odoo : `child_of`).
6. La recherche et la navigation ne portent que sur les produits visibles (même règle que ECOM-01).
7. La visibilité d'une catégorie parente suit celle de ses enfants (D3).
8. Une catégorie qui contient des sous-catégories ou des produits ne peut pas être supprimée (D5).

## 6. Erreurs et cas particuliers

- Cycle dans l'arbre : refus.
- Catégorie ou produit supprimé/inaccessible dans une URL : redirection vers la catégorie ou la boutique (Odoo : `handle_product_params_error`).
- Suppression d'une catégorie non vide : refus (D5). Odoo supprime en cascade les sous-catégories (`ondelete='cascade'` sur `parent_id`) et n'a aucune garde métier dans `product_public_category.py` (pas de `unlink`). Côté produits, la suppression du simple lien est le comportement ORM standard, non vérifié ici.
- Recherche sans résultat : affichage d'un message, sans erreur.

## 7. Recherche, tri et pagination

- **Champs cherchés (Odoo) :** nom et références des variantes (`variants_default_code`) ; avec l'option description (`search_in_description`, vrai par défaut dans `_get_shop_domain`) : description courte (`description_sale`) et description boutique (`description_ecommerce`).
- **Socle :** recherche texte sur nom et SKU ; tri par défaut = ordre d'affichage (Odoo : `shop_default_sort`, `website_sequence asc`) ; pagination (Odoo : 20 produits par page, 4 par ligne).
- **Standard complémentaire :** recherche dans les descriptions ; tri au choix du visiteur parmi les 5 tris d'Odoo (ordre d'affichage, nouveautés sur `publish_date`, nom A-Z, prix croissant, prix décroissant) ; filtre prix min/max ; filtres par attribut (OU au sein d'un attribut, ET entre attributs, à confirmer) ; tags ; autocomplétion (Odoo : module séparé `website_sale_autocomplete`, LGPL-3). Les filtres d'attributs d'Odoo portent sur les lignes d'attribut du template, pas sur les variantes réellement disponibles.
- **Point d'attention :** le filtre de prix **et** les tris par prix d'Odoo portent sur `list_price`, pas sur le prix après liste de prix. À traiter en ECOM-03 pour éviter un filtre ou un tri incohérent avec le prix affiché.
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
| Autocomplétion | `website_sale_autocomplete` | LGPL-3 (vérifié) |

Licences : `website_sale` et `website_sale_autocomplete` sont en LGPL-3 (vérifié). `product.tag` est référencé par le module `product` (LGPL-3) ; le modèle lui-même n'a pas été lu.

## 11. Classement (T6)

- **Socle :** arbre de catégories, rattachement multiple avec catégorie principale, navigation par catégorie (sous-arbre inclus), recherche texte nom + SKU, tri par défaut (ordre d'affichage), pagination, masquage des catégories sans produit visible, suppression refusée si la catégorie n'est pas vide.
- **Standard complémentaire :** recherche dans les descriptions, tri choisi par le visiteur (5 tris), filtres prix et attributs, tags, image de couverture, autocomplétion.
- **Option avancée :** grille à tailles variables (`website_size_x/y`), options d'affichage de catégorie, recherche dans les descriptions de catégories, domaine par site (multi-site).

## 12. Points non vérifiés

- `publish_date` : sert au tri « nouveautés » ; son mode d'alimentation (automatique à la publication, saisie, planifiée) n'est pas lu. Impact sur ECOM-01 (classée option avancée) à trancher.
- Combinaison ET/OU des domaines de filtre d'attributs, et clé du dictionnaire (supposée : un attribut par entrée).
- Accès direct par URL à une catégorie sans produit visible.
- Mécanisme `data-publish` (marquage front des entrées de navigation) non lu.
- Effet de la suppression d'une catégorie sur les produits rattachés (comportement ORM standard supposé).
- Modèle `product.tag`.
