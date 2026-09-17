# SpecForge — Infrastructure

## 1. Vue d'ensemble

SpecForge est organisé autour de trois niveaux :

```text
Interface
    ↓
Application / Bridge
    ↓
Core
```

Chaque niveau possède une responsabilité distincte.

### Interface

L'interface React permet à l'utilisateur de :

* construire la spécification ;
* sélectionner le profil et le type d'application ;
* consulter l'architecture ;
* visualiser les briques ;
* consulter les fichiers générés ;
* lancer l'assistance IA ;
* télécharger le projet.

L'interface ne doit pas devenir l'autorité de décision technique.

### Application / Bridge

`server.ts` fournit le pont entre l'application web et les services externes nécessaires.

Il utilise :

* Node.js ;
* Express ;
* middleware Vite.

Le bridge peut gérer les appels IA, mais ne doit pas reproduire la logique du Core.

### Core

Le Core constitue le moteur technique de SpecForge.

Il contient :

```text
types
registry
validator
resolver
generator
utils
```

Le Core doit rester indépendant de React, du DOM et de l'interface utilisateur.

---

## 2. Flux principal

```text
ProjectSpecification
        │
        ▼
     Validator
        │
        ▼
      Resolver
        │
        ▼
ResolvedArchitecture
        │
        ▼
     Generator
        │
        ▼
 GeneratedFiles
```

La spécification reste la source de vérité pendant tout le processus.

## 3. Registry

Le registre contient les briques connues du Core.

Une brique décrit notamment :

* ses capacités ;
* ses dépendances ;
* ses incompatibilités ;
* ses fichiers générables ;
* les contraintes nécessaires à son activation.

Le Resolver utilise ces informations pour construire une architecture cohérente.

## 4. Templates

Les templates de référence sont actuellement stockés dans :

```text
src/engine/presets.ts
```

Un template associe notamment :

```text
profil technique
        +
type d'application
        ↓
ProjectSpecification
```

Les presets servent de références techniques.

Ils ne doivent pas être confondus avec les projets utilisateurs.

## 5. Profils techniques

Le modèle actuel prévoit :

```text
rust
python
typescript
go
```

Seul `rust` est actuellement implémenté.

L'architecture doit toutefois conserver la possibilité d'ajouter progressivement les autres profils sans modifier le modèle fondamental.

## 6. Types d'application

Le modèle prévoit six types :

```text
web-frontend
web-app
web-platform
api-service
desktop
mobile
```

Un type indisponible pour un profil n'est pas supprimé de l'interface : il est présenté comme indisponible.

Cela permet de conserver une interface stable pendant l'extension progressive des templates.

## 7. Génération

Le Generator produit un ensemble de fichiers à partir de :

```text
ProjectSpecification
+
ResolvedArchitecture
```

La génération doit rester déterministe.

À spécification et architecture identiques, le résultat attendu doit rester identique.

Le Core calcule également un hash des fichiers générés afin de pouvoir vérifier cette propriété.

## 8. IA

L'IA est volontairement placée en périphérie du système.

```text
Utilisateur
    ↓
IA
    ↓
Proposition de spécification
    ↓
Core
```

L'IA peut proposer.

Le Core valide et résout.

L'utilisateur reste responsable de la validation finale.

L'IA ne doit pas devenir une seconde implémentation du Resolver ou du Generator.

## 9. Dépendances et infrastructure

SpecForge doit rester aussi léger que possible.

Toute nouvelle dépendance ou couche d'infrastructure doit répondre à un besoin concret du produit.

Avant d'introduire :

* une base de données ;
* un cache ;
* une file de messages ;
* un nouveau service ;
* une couche d'abstraction ;
* une infrastructure distribuée ;

il faut d'abord démontrer que le besoin ne peut pas être traité simplement par l'architecture existante.

## 10. Règle fondamentale

```text
UI ≠ Core
IA ≠ Core
Template ≠ Projet
Brique ≠ Template
```

Cette séparation est essentielle pour conserver un moteur compréhensible et évolutif.
