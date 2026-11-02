# SpecForge

**Specification → Architecture → Generation**

SpecForge est un outil de conception et de génération de squelettes de projets logiciels.

Son objectif est de transformer une intention structurée en une **architecture cohérente** et en un **squelette de projet exploitable**, sans chercher à générer un produit fini ni à remplacer le développeur.

![Aperçu de la page d’accueil SpecForge](assets/screenshots-accueil.png)

---

## Principe

```text
Profil technique
        +
Type d'application
        ↓
Template adapté
        ↓
ProjectSpecification
        ↓
        CORE
 ┌─────────────────┐
 │ Validate        │
 │ Resolve         │
 │ Generate        │
 └─────────────────┘
        ↓
Squelette du projet
        ↓
Développeur
```

La **ProjectSpecification** constitue la source de vérité.

Le **Core** constitue l'autorité technique : il valide la Specification, résout les dépendances et génère le résultat.

---

## Philosophie

SpecForge repose sur quelques principes simples :

* **Specification first** — l'intention est formalisée avant la génération.
* **Core first** — la logique technique appartient au Core, pas à l'interface.
* **Déterministe** — une même Specification doit produire un résultat prévisible.
* **Explicable** — les choix et erreurs doivent rester compréhensibles.
* **Modulaire** — les capacités techniques sont représentées par des briques.
* **Progressif** — la complexité n'est ajoutée que lorsqu'elle devient nécessaire.
* **Développeur libre** — le projet généré reste indépendant de SpecForge.

> SpecForge génère une base saine. Le développeur construit le produit.

---

## Interface utilisateur

L’accueil propose un parcours de création progressif, sur une seule page :

1. choisir un profil technique ;
2. choisir un template compatible ;
3. nommer le projet ;
4. générer et télécharger le squelette en ZIP.

Les étapes se dévoilent au fil des choix. Les vues destinées à l’exploration technique — spécification, architecture, fichiers, briques et audit — restent accessibles depuis le menu **Explorer**.

L’interface adopte l’identité **Obsidian Volcanic** : fonds sombres, surfaces translucides, accents violets et touches de rouge incandescent. Les tokens visuels et états interactifs sont définis dans `src/index.css`. Les assets `hero.png` et `hero-mobile.png` adaptent le fond aux écrans desktop et mobiles ; le mouvement de parallaxe est désactivé sur mobile et lorsque la réduction des animations est demandée.

Les sélecteurs personnalisés prennent en charge la navigation au clavier et les titres partagés utilisent une animation de vague avec halo, respectueuse de `prefers-reduced-motion`.

---

## Profils techniques

SpecForge est conçu pour supporter plusieurs profils :

* Rust
* Python
* TypeScript
* Go
* Static Web

Le profil **Static Web** génère des sites autonomes en HTML/CSS/JavaScript, à partir de Markdown ou de blocs configurables, sans framework ni backend. Rust dispose de sept modèles applicatifs; TypeScript propose Web Frontend avec React/Vite; Python et Go proposent chacun un premier modèle API Service, respectivement avec FastAPI et `net/http`. Les autres combinaisons Python/Go restent indisponibles jusqu’à leur implémentation.

---

## Types d'applications

Chaque profil peut proposer ses propres templates pour les mêmes grandes catégories d'applications :

| Type             | Description                        |
| ---------------- | ---------------------------------- |
| **Web Frontend** | Application web côté client        |
| **Web App**      | Frontend + backend                 |
| **Web Platform** | Frontend et backend séparés        |
| **API Service**  | Service backend sans interface web |
| **Desktop**      | Application bureau native          |
| **Mobile**       | Application mobile                 |
| **E-commerce**   | Squelette métier spécialisé pour une boutique |

Tous les types sont visibles dans l'interface. Un type peut simplement être indisponible lorsqu'aucun template n'est encore défini pour le profil sélectionné.

---

## Templates

Les templates décrivent des architectures de référence adaptées à un couple :

```text
Profil technique
        +
Type d'application
```

Ils sont actuellement définis dans :

```text
src/engine/presets.ts
```

Templates Rust actuellement disponibles :

* Rust + Askama + SQLite → Web App
* Rust + React + PostgreSQL → Web Platform
* Rust + Askama (frontend seul) → Web Frontend
* Rust Backend Only → API Service
* Rust + Tauri + React → Desktop
* Rust + Dioxus → Mobile
* Rust + Axum + React + PostgreSQL → E-commerce (`rust-ecommerce`)

Les types d'applications génériques sont couverts par un template Rust ; le preset e-commerce est une spécialisation métier distincte.

Premiers modèles des autres profils techniques :

* **TypeScript + Web Frontend** — React/Vite ;
* **Python + API Service** — FastAPI, REST, OpenAPI et tests ;
* **Go + API Service** — serveur standard `net/http`, REST, OpenAPI et tests.

Leur API de démonstration conserve les éléments en mémoire; aucune persistance, authentification ou conteneurisation n’est déclarée disponible pour ces profils. Les templates API-only (Python, Go, Rust Backend Only) peuvent produire un site documentaire autonome dans `docs-site/`, uniquement sur activation explicite dans l’éditeur (désactivé par défaut).

### Bricks UI/UX natives par template

Les modèles applicatifs hors Static Web portent une configuration `uiUx` dans la `ProjectSpecification` : pages et contenu Markdown (import de fichiers ou de dossiers `.md`), blocs composés, navigation, thème et assets. Cette configuration alimente **l’interface native du template** — aucun site HTML parallèle n’est généré :

* **Askama** (Web App, Web Frontend) — pages rendues dans les templates Askama, routes et handlers natifs, thème injecté dans les tokens CSS ;
* **React/Vite** (Web Platform, Web Frontend TypeScript, Desktop Tauri) — composant racine alimenté, navigation par état, thème dans `index.css` ;
* **Dioxus** (Mobile) — pages servies par le tiroir de navigation natif, thème dans `assets/main.css` ;
* **E-commerce** — vitrine pilotée par les données métier : seul le thème visuel est appliqué.

Les interfaces générées embarquent par défaut un **interrupteur clair/sombre** fonctionnel (préférence système au premier lancement, choix persisté), avec des palettes dérivées garantissant le contraste dans les deux modes. Les routes, handlers et flux métier des templates sont préservés.

Le système repose sur des contrats séparés dans `src/core/ui-ux/` : définitions de bricks centralisées, implémentations natives par cible, intégrations par template, validation et preview dédiés. Le système Static Web reste entièrement séparé.

Le profil Static Web propose trois templates de départ configurables :

* **Documentation** — pages Markdown hiérarchiques avec navigation latérale ;
* **Website** — site généraliste multi-pages composé de contenus et de blocs ;
* **Landing Page** — page de présentation composée de sections.

Le résultat peut être exporté en HTML autonome ou en projet multi-fichiers ZIP. Le moteur de rendu assainit le contenu Markdown et les fichiers générés ne dépendent pas de SpecForge, d’un backend ou d’un CDN.

L’éditeur Static Web suit cinq modules repliables — Type de site, Contenu, Structure, Apparence et Génération — avec leur état et un résumé des choix. La composition par blocs est facultative et se trouve dans la personnalisation avancée. Sur grand écran, l’aperçu Desktop est affiché à côté de la configuration; les formats Tablette et Mobile ainsi que les thèmes Clair et Sombre sont accessibles depuis les contrôles de l’aperçu. Sur petit écran, un onglet permet de basculer entre configuration et aperçu.

### Rust E-commerce V2

Le preset `rust-ecommerce` génère un squelette React/Vite, Axum et PostgreSQL/SQLx couvrant notamment le catalogue, les commandes, les comptes, les retours, les pages de contenu, les indicateurs d'administration et les documents opérationnels PDF.

Son interface reprend les principes visuels et les parcours du [prototype UI/UX R&D](docs/ecommerce/UI-UX_template_e-commerce/README.md). Ce prototype reste une référence de conception : ses données fictives ne sont pas reprises comme source fonctionnelle. Les écrans générés consomment les API du projet. Le résultat reste un squelette à adapter et configurer, pas une boutique prête à exploiter.

---

## Core

Le Core est indépendant de l'interface.

```text
src/core/
├── types.ts
├── utils.ts
├── registry.ts
├── validator.ts
├── resolver.ts
├── generator.ts
├── index.ts
├── static-web/
│   ├── bricks.ts
│   ├── config.ts
│   ├── content.ts
│   └── render.ts
├── ui-ux/
│   ├── bricks.ts
│   ├── config.ts
│   ├── registry.ts
│   ├── theme.ts
│   ├── preview.ts
│   └── implementations/
│       ├── askama.ts
│       ├── react.ts
│       ├── dioxus.ts
│       └── html-blocks.ts
└── bricks/
    └── default-bricks.ts
```

Le module `ui-ux/` porte les bricks UI/UX des templates applicatifs : configuration commune, définitions, implémentations natives par cible (Askama, React, Dioxus) et aperçus fidèles à chaque moteur. Le module `static-web/` reste le pipeline autonome du profil Static Web, réutilisé tel quel pour le site documentaire optionnel des templates API-only.

### Validator

Vérifie que la Specification est cohérente et que les capacités demandées sont supportées.

### Registry

Contient les briques techniques connues par SpecForge.

Une brique peut déclarer :

* ses capacités ;
* ses dépendances ;
* ses compatibilités ;
* ses conflits ;
* ses fichiers ;
* ses conditions d'activation.

### Resolver

Transforme la Specification en architecture résolue.

### Generator

Produit les fichiers du squelette à partir de l'architecture résolue.

---

## IA

L'IA est une **couche d'assistance**, pas l'autorité technique.

Elle peut notamment :

* aider à formaliser une intention ;
* proposer une Specification ;
* expliquer une architecture ;
* aider à comprendre les choix du système.

Le flux reste :

```text
Intention
    ↓
IA
    ↓
Proposition
    ↓
ProjectSpecification
    ↓
Core
    ↓
Validation / Résolution / Génération
```

L'IA peut proposer.

Le Core décide techniquement.

L'utilisateur valide.

---

## Architecture technique

```text
┌───────────────────────────────┐
│           React UI            │
│  Wizard / Specification /     │
│  Architecture / Files / Audit│
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     Node / Express Bridge     │
│                               │
│  API / IA / Vite middleware   │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│             Core              │
│                               │
│ Validate → Resolve → Generate  │
└───────────────────────────────┘
```

Le bridge applicatif ne doit pas devenir une seconde implémentation du Core.

---

## Stack actuelle

### Frontend

* React 19
* TypeScript
* Vite
* Tailwind CSS
* Lucide
* Motion

### Application / Bridge

* Node.js
* Express
* Vite middleware

### Core

* TypeScript
* architecture indépendante de React
* YAML pour les besoins de parsing/configuration

---

## Structure principale

```text
SpecForge/
├── docs/
│   ├── FICHE-PRODUIT.md
│   ├── ROADMAP.md
│   ├── ARCHITECTURE-CORE-BRICKS-TEMPLATES.md
│   ├── INVENTORY.md
│   ├── TRACKING.md
│   ├── INFRASTRUCTURE.md
│   ├── MAINTENANCE-EVOLUTION.md
│   └── SpecForge-Templates-référence-V1.md
│
├── src/
│   ├── core/
│   │   ├── bricks/
│   │   ├── static-web/
│   │   ├── ui-ux/
│   │   ├── generator.ts
│   │   ├── index.ts
│   │   ├── registry.ts
│   │   ├── resolver.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── validator.ts
│   │
│   ├── components/
│   ├── engine/
│   │   └── presets.ts
│   └── types/
│
├── server.ts
├── package.json
└── README.md
```

---

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

## Build

```bash
npm run build
```

---

## Documentation

La documentation du projet est volontairement séparée par responsabilité.

* **[FICHE-PRODUIT.md](docs/FICHE-PRODUIT.md)** — vision, périmètre et principes du produit.
* **[ROADMAP.md](docs/ROADMAP.md)** — évolutions prévues et ordre des priorités.
* **[ARCHITECTURE-CORE-BRICKS-TEMPLATES.md](docs/ARCHITECTURE-CORE-BRICKS-TEMPLATES.md)** — architecture du Core, des briques et des templates.
* **[INVENTORY.md](docs/INVENTORY.md)** — inventaire fonctionnel des briques.
* **[TRACKING.md](docs/TRACKING.md)** — suivi d'avancement.
* **[INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** — architecture technique.
* **[MAINTENANCE-EVOLUTION.md](docs/MAINTENANCE-EVOLUTION.md)** — règles de maintenance et d'évolution.
* **[SpecForge-Templates-référence-V1.md](docs/SpecForge-Templates-référence-V1.md)** — templates et architectures de référence.
* **[ADR e-commerce](docs/ecommerce/ADR-TEMPLATE-ECOMMERCE.md)** — décisions d'architecture, de périmètre et d'intégration.
* **[Modèle de domaine e-commerce V2](docs/ecommerce/MODELE-DOMAINE-V2.md)** — contrats des contenus, métriques, permissions et documents.
* **[Prototype UI/UX R&D](docs/ecommerce/UI-UX_template_e-commerce/README.md)** — périmètre et décisions du prototype statique.

---

## État actuel

SpecForge est actuellement un **prototype fonctionnel en évolution**.

Le socle suivant est en place :

* Core indépendant de l'interface ;
* validation des Specifications ;
* résolution d'architecture ;
* génération déterministe ;
* Registry de briques ;
* système de profils techniques ;
* système de templates par profil et type d'application ;
* sept presets Rust : Web App, Web Platform, Web Frontend, API Service, Desktop, Mobile et E-commerce V2 ;
* premiers templates TypeScript Web Frontend, Python API Service et Go API Service ;
* bricks UI/UX natives par template : la configuration partagée (pages, blocs, navigation, thème, assets) alimente l’interface native de chaque template, sans site parallèle ;
* interrupteur clair/sombre fonctionnel par défaut dans toutes les interfaces générées ;
* site documentaire `docs-site/` optionnel pour les templates API-only (désactivé par défaut) ;
* génération Desktop (Tauri) et Mobile (Dioxus) ;
* interface de vérification et d'audit ;
* assistance IA séparée du Core.

Le preset e-commerce illustre une spécialisation métier complète au-dessus des briques du Core. L'éditeur UI/UX configure pages, blocs, navigation et apparence pour les presets non Static Web; l’aperçu utilise le moteur de la cible (Askama, React, Dioxus) avec pages empilées cliquables et menu burger responsive.

---

## Direction future

La configuration UI/UX partagée alimente désormais l’interface native de chaque template (pages, blocs, navigation, thème avec interrupteur clair/sombre). Les prochaines évolutions pourront l’enrichir, indépendamment des choix propres aux presets spécialisés, notamment :

```text
Projet
  ↓
Interface
  ├── Navigation
  ├── Hubs
  └── Sous-hubs
  ↓
Thème
  ├── Style
  ├── Couleur principale
  └── Couleur accent
```

Cette configuration restera volontairement simple.

Elle servira à enrichir la **ProjectSpecification** avant son passage dans le Core, et chaque nouveau template déclarera son intégration UI/UX (cible de rendu native) dans le registre du Core.

---

## Principe de développement

SpecForge évolue de manière incrémentale :

```text
Besoin
  ↓
Investigation ciblée
  ↓
Modification minimale
  ↓
Build / Vérification
  ↓
Validation
  ↓
Checkpoint
```

La priorité est de conserver une architecture :

**simple, déterministe, lisible, modulaire et évolutive.**

La complexité n'est introduite que lorsqu'un besoin réel la justifie.
