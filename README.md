# SpecForge

SpecForge est une plateforme de conception et de génération de projets logiciels basée sur une approche **Specification → Architecture → Generation**.

L'objectif est de transformer une intention de projet en une spécification structurée, puis de laisser un moteur déterministe résoudre l'architecture et générer les fichiers correspondants.

> **La spécification est la source de vérité. Le Core est l'autorité technique.**

## État du projet

**V1 POC — fonctionnelle**

La V1 permet actuellement de :

* sélectionner un profil technique ;
* sélectionner un type d'application ;
* charger le template correspondant au couple profil × application ;
* éditer la spécification du projet ;
* résoudre l'architecture ;
* valider les contraintes et dépendances ;
* visualiser les briques actives ;
* générer les fichiers du projet ;
* télécharger le résultat sous forme d'archive ZIP ;
* utiliser une assistance IA pour proposer une spécification ;
* vérifier le comportement du moteur avec l'audit intégré.

Le profil **Rust** est actuellement le seul profil réellement implémenté.

Les six types d'application prévus sont :

* Web Frontend
* Web App
* Web Platform
* API Service
* Desktop
* Mobile

Certaines combinaisons profil × application restent volontairement indisponibles dans cette V1.

## Principe

```text
Intention
   ↓
Spécification
   ↓
Profil technique + Type d'application
   ↓
Template de référence
   ↓
Core
 ├── Validation
 ├── Résolution
 └── Génération
   ↓
Projet généré
```

L'IA peut aider à construire une spécification à partir d'une intention en langage naturel.

Elle ne décide cependant pas de l'architecture finale : la validation, la résolution des dépendances et la génération appartiennent au **Core déterministe**.

## Architecture générale

```text
┌──────────────────────────────────────┐
│              Interface               │
│          React + TypeScript          │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          Application / Bridge        │
│           Node.js + Express          │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│                 Core                 │
│                                      │
│ Types → Registry → Validator         │
│              ↓                       │
│           Resolver                   │
│              ↓                       │
│          Generator                   │
└──────────────────────────────────────┘
```

Le Core ne dépend pas de l'interface React.

## Stack

### Frontend

* React 19
* TypeScript
* Vite
* Tailwind CSS
* Lucide React
* Motion

### Backend / Bridge

* Node.js
* Express
* TypeScript
* Vite middleware

Le serveur expose notamment les endpoints nécessaires à l'assistance IA.

### Core

Le moteur principal est écrit en TypeScript et contient notamment :

* modèles de spécification ;
* registre de briques ;
* validation ;
* résolution d'architecture ;
* génération ;
* calcul de hash déterministe.

## Arborescence

```text
src/
├── components/       Interface React
├── core/              Moteur déterministe
│   ├── bricks/        Briques natives du Core
│   ├── generator.ts
│   ├── registry.ts
│   ├── resolver.ts
│   ├── types.ts
│   ├── utils.ts
│   └── validator.ts
├── engine/            Compatibilité / presets / façade historique
├── types/             Réexport des types de spécification
├── App.tsx
└── main.tsx

docs/
├── SpecForge-Templates-référence-V1.md
├── INFRASTRUCTURE.md
└── MAINTENANCE-EVOLUTION.md
```

## Installation

### Prérequis

* Node.js
* npm

### Installation

```bash
npm install
```

### Développement

```bash
npm run dev
```

### Build

```bash
npm run build
```

Le build produit le frontend Vite ainsi que le serveur Node bundlé.

## Assistance IA

L'assistance IA permet de transformer une intention en spécification structurée.

Elle constitue une **aide à la conception**, et non une autorité technique.

Le principe est :

```text
Intention utilisateur
        ↓
      IA
        ↓
Proposition de Spec
        ↓
Validation Core
        ↓
Architecture résolue
```

Une spécification invalide reste invalide, même si elle a été proposée par l'IA.

## Templates et profils

Les templates de référence sont actuellement définis dans :

```text
src/engine/presets.ts
```

Ils sont sélectionnés par :

```text
Profil technique
        +
Type d'application
        ↓
Template
        ↓
ProjectSpecification
```

Le document de référence des templates V1 se trouve dans :

```text
docs/SpecForge-Templates-référence-V1.md
```

## Limites actuelles de la V1

La V1 est un POC et ne cherche pas encore à couvrir toutes les possibilités.

Notamment :

* le profil Rust est le seul profil réellement implémenté ;
* plusieurs types d'application sont encore indisponibles pour Rust ;
* certaines capacités demandées par les templates ne disposent pas encore de brique correspondante ;
* le registre de briques va continuer à évoluer ;
* les profils Python, TypeScript et Go sont prévus par le modèle mais ne constituent pas encore des implémentations V1.

Ces limitations sont volontairement visibles dans l'interface et dans les diagnostics du Core.

## Documentation

* `docs/SpecForge-Templates-référence-V1.md` — templates de référence
* `docs/INFRASTRUCTURE.md` — architecture et infrastructure
* `docs/MAINTENANCE-EVOLUTION.md` — règles d'évolution et de maintenance

## Philosophie

SpecForge privilégie :

* la déterminisme ;
* la simplicité ;
* la traçabilité ;
* la séparation des responsabilités ;
* la validation explicite ;
* des architectures compréhensibles ;
* une évolution progressive.

**La complexité doit être ajoutée lorsqu'elle est nécessaire, pas par anticipation.**
