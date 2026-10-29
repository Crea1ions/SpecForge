# ECOM-13 — Pages et contenu

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `website`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Une page de contenu a une URL, un titre, un contenu structuré, un site, un statut de publication et un indicateur d'indexation | Partiel : Odoo stocke le contenu comme une vue (`ir.ui.view`, `_inherits`) |
| D2 | Publication par statut, avec date de publication programmable | Non : `is_visible` = publiée et date passée |
| D3 | URL unique par site, garantie par contrainte de données | Partiel : Odoo la garantit par code (`get_unique_path` dans `write` et `clone_page`), sans contrainte SQL lue |
| D4 | Menu arborescent, lié à une page ou à une URL, avec ordre et ouverture dans un nouvel onglet | Non : `website.menu` |
| D5 | Un menu n'est affiché que si sa page est visible ; l'administration voit tout | Non : `_compute_visible` du menu |
| D6 | Page protégée par mot de passe : option avancée ; son menu reste affiché *(proposition)* | Non : le mode `password` n'est pas filtré |
| D7 | Duplication d'une page, avec son menu en option | Non : `clone_page` |
| D8 | Pages légales (conditions, confidentialité, mentions) : socle, contenu libre *(proposition)* | Non lu |
| D9 | Tout contenu HTML saisi est assaini, y compris celui des menus déroulants *(proposition)* | Oui : `sanitize=False` sur `mega_menu_content` supprime tout assainissement de ce champ ; le groupe `base.group_sanitize_override` ne concerne que les champs `sanitize_overridable` (ECOM-16 D6) ; droits d'écriture du méga-menu non lus |
| D10 | Édition visuelle, formulaires de contact et blocs dynamiques : option avancée | Non lu |

## 1. Objectif et périmètre

Permettre à l'équipe de publier des pages de contenu et de structurer la navigation du site.

Dans le périmètre : pages, publication, menus, visibilité, pages légales, duplication.

Hors périmètre : catalogue et fiches produit (ECOM-01), rôles (ECOM-12), notifications (ECOM-14), référencement détaillé (ECOM-15), documents (ECOM-17).

## 2. Objets métier

- **Page** : contenu public à une URL, rattaché à un site.
- **Publication** : statut, avec date programmable.
- **Menu** : entrée de navigation, arborescente, liée à une page ou à une URL.
- **Visibilité** : résultat calculé de la publication, de la date et de l'accès.
- **Page légale** : page de contenu exigée par la loi.

## 3. Données

**Page** (Odoo : `website.page`)

| Champ | Règle |
|---|---|
| URL | Obligatoire ; normalisée (`/` + slug) ; unique par site (D3) |
| Titre, contenu | Le contenu est stocké comme une vue (D1) |
| Site | Vide = page générique ; suppression du site = suppression de la page |
| Publication | Booléen ; publiée pour un site seulement si sans site ou site courant |
| Date de publication | Facultative ; page visible si vide ou passée |
| Indexée | Booléen, défaut vrai |
| Visibilité | Accès libre, mot de passe ou groupes ; les groupes sont vidés hors mode groupes |
| Clé technique | Unique, recalculée au changement de nom |
| Dernière modification | Auteur et date du contenu |
| Modèle de page | Indicateur « proposée dans les nouvelles pages » |

**Menu** (Odoo : `website.menu`)

| Champ | Règle |
|---|---|
| Nom | Obligatoire, traduisible |
| URL | Obligatoire ; `#` par défaut ; calculée depuis la page liée |
| Page liée | Suppression de la page = suppression du menu |
| Parent, ordre | Arbre ; ordre par séquence |
| Nouvel onglet | Booléen |
| Groupes visibles | Restreint l'affichage |
| Méga-menu | Contenu HTML (D9) |

## 4. États et transitions

**Publication d'une page :** brouillon, publiée, programmée (publiée avec date future).

| De | Vers | Déclencheur |
|---|---|---|
| brouillon | publiée | Publication par l'administration |
| publiée | programmée | Date de publication future *(déduit de `is_visible`)* |
| programmée | visible | Date atteinte |
| publiée | brouillon | Dépublication |

## 5. Invariants et règles de validation

1. Une page est visible si elle est publiée et si sa date de publication est vide ou passée (Odoo : `_compute_visible`).
2. L'URL est normalisée en slug et rendue unique pour le site (D3 ; Odoo : `write`).
3. Changer l'URL met à jour les menus liés et l'URL d'accueil si elle pointait la page (Odoo : `write`).
4. Renommer une page recalcule sa clé unique (Odoo : `get_unique_key`).
5. Une visibilité autre que « groupes » efface les groupes (Odoo : `write`).
6. Supprimer une page supprime ses menus ; sa vue n'est supprimée que si aucune autre page ne l'utilise (Odoo : `unlink`).
7. Un menu lié à une page n'est affiché au public que si la page est visible et accessible ; l'administration voit tout (D5).
8. Une page protégée par mot de passe garde son menu affiché *(proposition, D6)*.
9. Dupliquer une page crée une copie sur le site courant ; le menu n'est copié que si le site est le même (D7).
10. Tout contenu HTML saisi est assaini (D9).

## 6. Erreurs et cas particuliers

- Page générique copiée : devient une page du site courant, sans menu.
- Changement d'URL : aucune redirection depuis l'ancienne adresse n'est lue.
- Page d'accueil renommée : l'URL d'accueil suit (Odoo : synchronisation dans `write`).
- Écart d'Odoo : le contenu du méga-menu n'est pas assaini ; D9 l'interdit.
- Écart d'Odoo : l'unicité de l'URL repose sur du code, pas sur une contrainte.

## 7. Parcours

**Odoo Community :**
- L'administrateur crée ou duplique une page, la publie (éventuellement avec une date), puis l'ajoute au menu.
- Le visiteur accède à la page par son URL ; le menu n'apparaît que si la page est visible.
- Un formulaire public envoie ses données par `/website/form/<modèle>`, protégé par un captcha.

**SpecForge *(proposition)* :**
1. L'éditeur de contenu crée une page avec une URL, un titre et un contenu (D1).
2. Il la publie ou programme sa publication (D2).
3. Il l'ajoute à la navigation, avec un ordre et un parent (D4).
4. Il publie les pages légales, obligatoires au socle (D8).
5. Il change l'URL : les menus suivent (§5 règle 3).
6. Il duplique une page pour en créer une variante (D7).

## 8. Frontières

- **Page ≠ fiche produit :** la page est du contenu libre, la fiche produit relève d'ECOM-01.
- **Publication ≠ visibilité :** la publication est un statut, la visibilité est le résultat calculé avec la date et l'accès (D2).
- **Menu ≠ page :** un menu peut pointer une URL sans page (D4).
- **Visibilité de page ≠ droits d'administration :** ECOM-12 et ECOM-16.
- **Formulaire public ≠ commande :** les envois de formulaire ne créent pas de commande.
- **Externalisable :** captcha (service tiers), gestion de contenu par un CMS externe (ECOM-18).
- **Permissions :** l'édition des pages est réservée à l'éditeur de contenu et au gestionnaire (ECOM-12 D1).

## 9. Dépendances

- Entrantes : ECOM-12 (rôles), ECOM-01 (pages de catalogue liées au menu).
- Sortantes : ECOM-15 (indexation et statistiques), ECOM-16, ECOM-18 (captcha, CMS), ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Page | `website` | `website.page`, `_inherits` de `ir.ui.view` |
| Publication par site | `website` | `website.published.multi.mixin`, `_compute_visible`, `date_publish` |
| URL unique | `website` | `get_unique_path`, `write`, `clone_page` |
| Menu | `website` | `website.menu`, `_compute_visible`, `group_ids`, `parent_id` |
| Visibilité de la vue | `website` | `_get_cached_visibility`, `_handle_visibility`, mode `password` |
| Formulaire public | `website` | `/website/form`, captcha `website_form` |
| Captcha | `google_recaptcha` | dépendance de `website` |

Licences : `website` en LGPL-3 (vérifié). `google_recaptcha`, `html_builder`, `html_editor` non vérifiés. Dépendance externe : `geoip2`. `website` est volumineux : s'inspirer, ne pas réutiliser sans étude (L7).

## 11. Classement (T6)

- **Socle :** pages avec URL unique, publication, menus arborescents, visibilité calculée, pages légales.
- **Standard complémentaire :** publication programmée, duplication, indexation par page, assainissement du contenu.
- **Option avancée :** protection par mot de passe ou groupes, méga-menus, édition visuelle, formulaires publics, blocs dynamiques, multi-sites.

## 12. Points non vérifiés

- Définition de `is_published` dans `website.published.mixin` (fichier non localisé).
- Contenu des pages légales de `website_data.xml`.
- Liste des modèles acceptés par `/website/form/<modèle>` ; effet de `csrf=False`.
- Redirection depuis l'ancienne URL après changement.
- Contrainte SQL d'unicité de l'URL ; concurrence.
- Suite de `_compute_visible` du menu (pages de modèle).
- Modes de `visibility` autres que `password` et `restricted_group`.
- Licences de `google_recaptcha`, `html_builder`, `html_editor`.
