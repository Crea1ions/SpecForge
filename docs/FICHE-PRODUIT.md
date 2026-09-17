# SpecForge — Fiche Produit

**Version :** 1.1
**Statut :** Prototype fonctionnel / fondation V1
**Positionnement :** Specification → Architecture → Generation

---

## 1. Identité du produit

| Élément                            | Description                                                        |
| ---------------------------------- | ------------------------------------------------------------------ |
| **Nom**                            | SpecForge                                                          |
| **Nature**                         | Outil de conception, résolution et génération de projets logiciels |
| **Principe central**               | Specification → Architecture → Generation                          |
| **Source de vérité**               | ProjectSpecification                                               |
| **Autorité technique**             | Core déterministe                                                  |
| **Interface**                      | React / TypeScript                                                 |
| **Profil actuellement implémenté** | Rust                                                               |
| **Statut**                         | Prototype fonctionnel                                              |

---

## 2. Vision

SpecForge transforme une intention de projet logiciel en une architecture cohérente puis en un projet généré.

L'objectif n'est pas de demander à une IA de décider seule de l'architecture.

SpecForge sépare explicitement :

1. l'intention ;
2. la spécification ;
3. la résolution technique ;
4. la génération.

Le système doit rester compréhensible, déterministe et vérifiable.

---

## 3. Principe fondamental

```text
Intention
   ↓
ProjectSpecification
   ↓
Validation
   ↓
Résolution d'architecture
   ↓
Architecture résolue
   ↓
Génération
   ↓
Projet
```

La spécification décrit **ce que le projet doit être**.

Le Core détermine **comment les exigences peuvent être satisfaites**.

Le Generator produit **les artefacts correspondant à cette architecture**.

---

## 4. Rôle de l'IA

L'IA est une couche d'assistance.

Elle peut :

* interpréter une intention exprimée en langage naturel ;
* proposer une spécification ;
* expliquer une architecture ;
* aider l'utilisateur à comprendre une erreur ou un choix technique.

Elle ne constitue pas l'autorité technique finale.

```text
Utilisateur
    ↓
IA — proposition / assistance
    ↓
ProjectSpecification
    ↓
Core — validation / résolution
    ↓
Architecture
```

Une proposition de l'IA doit donc pouvoir être refusée, corrigée ou validée.

---

## 5. Core

Le Core constitue le noyau technique de SpecForge.

Il est indépendant de l'interface utilisateur.

### Modules principaux

```text
src/core/

├── types.ts
├── registry.ts
├── validator.ts
├── resolver.ts
├── generator.ts
├── utils.ts
└── bricks/
```

### Responsabilités

**Validator**

* détecte les incohérences ;
* vérifie les contraintes ;
* signale les capacités manquantes.

**Registry**

* référence les briques disponibles ;
* expose leurs capacités ;
* décrit leurs dépendances et incompatibilités.

**Resolver**

* sélectionne les briques nécessaires ;
* construit l'architecture résolue ;
* vérifie les relations entre composants.

**Generator**

* transforme l'architecture résolue en fichiers ;
* produit un résultat déterministe.

---

## 6. Briques

Une brique représente une capacité technique exploitable par le Core.

Elle peut déclarer notamment :

* capacités fournies ;
* dépendances ;
* compatibilités ;
* conflits ;
* fichiers générés ;
* conditions d'activation.

Une brique n'est pas un template complet.

```text
Brique
    ↓
Capacité technique

Template
    ↓
Composition cohérente de capacités pour
un type d'application et un profil donné
```

---

## 7. Profils techniques

SpecForge distingue le **profil technique** du **type d'application**.

Profils prévus par le modèle :

```text
Rust
Python
TypeScript
Go
```

### État actuel

| Profil     | État       |
| ---------- | ---------- |
| Rust       | Implémenté |
| Python     | Prévu      |
| TypeScript | Prévu      |
| Go         | Prévu      |

Les profils futurs doivent pouvoir être ajoutés sans remettre en cause le modèle général du Core.

---

## 8. Types d'application

Les types d'application sont indépendants du profil technique.

```text
Web Frontend
Web App
Web Platform
API Service
Desktop
Mobile
```

Un profil peut proposer son propre template pour chacun de ces types.

L'absence actuelle d'un template ne signifie pas que le type est conceptuellement interdit.

---

## 9. Modèle Profile × Application Type

Le modèle de référence est :

```text
Profil technique
        +
Type d'application
        ↓
Template
        ↓
ProjectSpecification
        ↓
Core
```

Exemple :

```text
Rust + Desktop
        ↓
Rust + Tauri + React + SQLite
```

Autre exemple futur :

```text
Rust + Web Frontend
        ↓
Rust + Axum + HTML + HTMX + JavaScript + CSS
```

Le template détermine la composition technique adaptée au contexte.

---

## 10. Templates Rust actuellement disponibles

### Web App

```text
React
   ↓
REST
   ↓
Axum
   ↓
SQLite / SQLx
```

### Web Platform

```text
React
   ↓
REST
   ↓
Axum
   ↓
PostgreSQL / SQLx
```

avec une séparation frontend/backend adaptée à un déploiement indépendant.

### API Service

```text
Axum
   ↓
SQLite / SQLx
```

sans frontend.

### Desktop

```text
React
   ↓
Tauri IPC
   ↓
Rust / Tauri
   ↓
SQLite / SQLx
```

Tauri constitue ici le runtime local de l'application. Aucun serveur HTTP Axum séparé n'est requis.

---

## 11. Génération

La génération doit être :

* déterministe ;
* reproductible ;
* traçable ;
* indépendante de l'interface ;
* basée sur l'architecture résolue.

Le Core peut calculer une empreinte des fichiers générés afin de permettre leur comparaison et leur vérification.

---

## 12. Interface utilisateur

L'interface permet actuellement d'explorer :

* la spécification ;
* le profil technique ;
* le type d'application ;
* l'architecture ;
* les fichiers générés ;
* les briques ;
* l'audit ;
* l'assistance IA.

L'interface visualise les décisions du Core mais ne doit pas reproduire sa logique métier.

Principe :

```text
UI ≠ Core
```

---

## 13. Architecture applicative

```text
┌───────────────────────────────┐
│           React UI            │
│ Wizard / Spec / Architecture  │
│ Files / Bricks / Audit        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      Node / Express Bridge    │
│ API applicative + IA          │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│             CORE              │
│                               │
│ Types                         │
│ Registry                      │
│ Validator                     │
│ Resolver                      │
│ Generator                     │
└───────────────┬───────────────┘
                │
                ▼
        Generated Project
```

Le bridge applicatif ne constitue pas le moteur d'architecture.

---

## 14. État V1

### Fonctionnel

* Core indépendant de l'UI ;
* validation ;
* résolution ;
* registry ;
* génération ;
* hash déterministe ;
* système de briques ;
* système Profile × Application Type ;
* templates Rust principaux ;
* génération Desktop/Tauri ;
* interface de visualisation ;
* audit ;
* export du projet ;
* documentation de l'architecture.

### En cours

* complétion des briques Core ;
* authentification ;
* couverture accrue des templates ;
* tests plus complets ;
* validation des différents scénarios de génération.

### Non implémenté

* profils Python ;
* profils TypeScript ;
* profils Go ;
* tous les templates pour tous les profils ;
* industrialisation complète du système de génération.

---

## 15. Hors périmètre actuel

SpecForge n'a pas vocation, à ce stade, à devenir :

* un IDE complet ;
* un générateur piloté exclusivement par LLM ;
* une plateforme d'exécution de projets ;
* un orchestrateur cloud distribué ;
* une usine à microservices ;
* un système nécessitant une infrastructure complexe par défaut.

L'infrastructure doit rester minimale tant qu'un besoin réel ne justifie pas son ajout.

---

## 16. Principes d'évolution

### Déterminisme

Une même spécification doit produire un résultat prévisible.

### Séparation des responsabilités

```text
UI ≠ Core
IA ≠ Core
Template ≠ Projet
Brique ≠ Template
```

### Validation explicite

Une incohérence doit être signalée plutôt que masquée.

### Simplicité

La complexité n'est introduite que lorsqu'elle répond à un besoin réel.

### Extensibilité

Le modèle doit permettre l'ajout progressif de profils, templates et briques sans réécriture du Core.

### Traçabilité

Les décisions techniques doivent pouvoir être comprises et expliquées.

---

## 17. Direction actuelle

La priorité de SpecForge n'est plus d'accumuler des fonctionnalités.

La priorité est de consolider le modèle :

```text
Specification
      ↓
Validation
      ↓
Architecture
      ↓
Generation
```

puis de démontrer que ce modèle fonctionne de manière fiable sur un nombre croissant de cas réels.

Le développement doit donc progresser par étapes :

```text
Besoin réel
    ↓
Investigation ciblée
    ↓
Modification minimale
    ↓
Build / vérification
    ↓
Validation
    ↓
Checkpoint
```

---

## 18. Positionnement

SpecForge reprend deux idées complémentaires :

* l'expérience de portail et de catalogue associée aux outils comme Backstage ;
* l'approche specification-first et la résolution déterministe associées à NAEOS.

SpecForge constitue cependant son propre système, avec son propre modèle de spécification, son propre Core, son propre registre de briques et son propre système de génération.

---

## 19. État de référence

La référence actuelle du produit est constituée de :

```text
README.md

docs/
├── INFRASTRUCTURE.md
├── MAINTENANCE-EVOLUTION.md
└── SpecForge-Templates-référence-V1.md
```

Cette fiche produit décrit la direction produit.

Les autres documents décrivent respectivement :

* l'infrastructure et l'architecture technique ;
* les règles de maintenance et d'évolution ;
* les templates de référence.

---

## 20. Principe directeur

> **SpecForge ne demande pas à l'IA de construire n'importe quoi.**
>
> **Il transforme une intention en spécification, vérifie cette spécification, résout une architecture cohérente et génère un projet correspondant.**

La complexité est ajoutée lorsqu'elle devient nécessaire, pas en anticipation d'un besoin hypothétique.
