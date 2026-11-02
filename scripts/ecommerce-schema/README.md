# Génération de docs/ecommerce/SCHEMA-DONNEES.md

Extraction statique (AST Python) des modèles Odoo du périmètre e-commerce.
Aucune base de données requise.

## Usage (depuis la racine du dépôt)

    ODOO_SRC=~/Devtop/Odoo/odoo python3 scripts/ecommerce-schema/extract.py
    python3 scripts/ecommerce-schema/build.py

## Fichiers
- extract.py : lit les modules du périmètre (liste tirée de docs/ecommerce/CARTOGRAPHIE.md),
  écrit schema.json (ignoré par Git).
- render.py : fonctions de rendu d'une section par modèle.
- build.py : assemble le document et écrit docs/ecommerce/SCHEMA-DONNEES.md.

## Entrées
- docs/ecommerce/CARTOGRAPHIE.md et docs/ecommerce/fiches/ECOM-*.md (périmètre).
- Les sources Odoo (ODOO_SRC, défaut ~/Devtop/Odoo/odoo).

## Limites
- Extraction statique : l'état d'une base réelle n'est pas reflété.
- Les noms d'index sont ceux déclarés dans le code.
