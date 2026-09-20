# SpecForge — Fiche Produit

**Version :** 1.0
**Statut :** Prototype fonctionnel — fondation V1
**Nature :** Outil de spécification, résolution d'architecture et génération de squelettes de projets

---

## 1. Identité du produit

| Élément                            | Description                                      |
| ---------------------------------- | ------------------------------------------------ |
| **Nom**                            | SpecForge                                        |
| **Nature**                         | Outil de conception et de génération de projets  |
| **Positionnement**                 | Specification → Architecture → Generation        |
| **Livrable**                       | Squelette de projet exploitable et extensible    |
| **Autorité technique**             | Core déterministe                                |
| **Source de vérité**               | ProjectSpecification                             |
| **IA**                             | Assistance à la formalisation et à l'explication |
| **Profil actuellement implémenté** | Rust                                             |

---

## 2. Vision

SpecForge a pour objectif de permettre à un utilisateur de définir rapidement les grandes lignes d'un projet logiciel, puis de transformer cette définition en une base technique cohérente et exploitable.

Le produit ne cherche pas à générer automatiquement un produit fini.

Il cherche à produire :

> **une base saine, structurée et suffisamment avancée pour permettre au développeur de poursuivre le développement sans repartir de zéro.**

Le projet généré doit rester compréhensible, modifiable et extensible.

SpecForge fournit donc une **fondation**, et non une solution définitive.

---

## 3. Principe fondamental

Le fonctionnement de SpecForge repose sur trois étapes :

```text
Specification
      ↓
Architecture
      ↓
Generation
```

### Specification

La spécification décrit l'intention du projet :

* profil technique ;
* type d'application ;
* caractéristiques du projet ;
* choix techniques ;
* paramètres nécessaires à la génération.

La spécification constitue la source de vérité.

### Architecture

Le Core analyse la spécification et détermine une architecture cohérente à partir des briques disponibles.

Il vérifie notamment :

* les dépendances ;
* les capacités disponibles ;
* les incompatibilités ;
* les contraintes techniques ;
* les éléments nécessaires à la génération.

### Generation

Le générateur transforme l'architecture résolue en fichiers et en structure de projet.

La génération doit être :

* déterministe ;
* reproductible ;
* compréhensible ;
* indépendante de l'interface utilisateur.

---

# 4. Rôle du Core

Le Core constitue l'autorité technique de SpecForge.

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

Le Core ne dépend pas de l'interface React.

Il ne doit pas dépendre de l'IA pour prendre ses décisions techniques.

Il doit pouvoir fonctionner à partir d'une `ProjectSpecification` valide.

### Responsabilités

**Validator**

Vérifie la cohérence de la spécification.

**Resolver**

Détermine les briques nécessaires et résout l'architecture.

**Registry**

Contient les briques techniques disponibles et leurs relations.

**Generator**

Produit les fichiers correspondant à l'architecture résolue.

**Utils**

Contient les fonctions techniques communes, notamment le calcul de hash permettant de vérifier la déterminisme de la génération.

---

# 5. Briques techniques

Les briques constituent les composants techniques élémentaires utilisés par le Core.

Une brique peut déclarer notamment :

* son identité ;
* ses capacités ;
* ses dépendances ;
* ses compatibilités ;
* ses conflits ;
* les fichiers qu'elle peut générer ;
* ses conditions d'activation.

Le Core utilise ces informations pour construire l'architecture.

Le système doit rester extensible : l'ajout d'une nouvelle capacité doit pouvoir se faire par l'ajout ou l'évolution d'une brique, sans nécessiter une refonte globale du Core.

---

# 6. Profils techniques

SpecForge distingue le **profil technique** du **type d'application**.

Le modèle cible est :

```text
Profil technique
        +
Type d'application
        ↓
Template adapté
        ↓
ProjectSpecification
        ↓
Core
```

Les profils prévus par le modèle sont :

* Rust
* Python
* TypeScript
* Go

### État actuel

Seul **Rust** est actuellement implémenté.

Les autres profils font partie de l'architecture cible, mais ne constituent pas le périmètre de développement actuel.

---

# 7. Types d'applications

Les types d'applications visibles dans SpecForge sont communs aux différents profils.

```text
Web Frontend
Web App
Web Platform
API Service
Desktop
Mobile
```

Un même type d'application peut être implémenté différemment selon le profil technique sélectionné.

Par exemple :

```text
Rust + Web App
        ↓
Rust / Axum / React / SQLite

Rust + Desktop
        ↓
Tauri / Rust / React / SQLite
```

Le type d'application décrit donc **ce que l'on cherche à construire**, tandis que le profil décrit **l'environnement technique de référence**.

---

# 8. Templates

Les templates constituent les configurations de référence permettant d'associer un profil technique à un type d'application.

Ils sont actuellement regroupés dans :

```text
src/engine/presets.ts
```

Le système utilise la combinaison :

```text
profile + template
```

pour sélectionner le template correspondant.

### Templates Rust actuellement disponibles

* Rust + React + SQLite — Web App
* Rust + React + PostgreSQL — Web Platform
* Rust + Tauri + React — Desktop
* Rust Backend Only — API Service

Certains types d'application Rust restent volontairement indisponibles tant que leur template n'est pas réellement implémenté.

L'interface ne doit pas simuler une disponibilité qui n'existe pas dans le Core.

---

# 9. Interface de configuration actuelle

La première version de SpecForge conserve une configuration volontairement simple.

L'utilisateur choisit :

1. son profil technique ;
2. son type d'application ;
3. les paramètres nécessaires au projet.

Le système actuel permet déjà de sélectionner les différentes familles d'applications et d'utiliser les templates disponibles pour le profil Rust.

Cette approche doit rester la base du produit.

---

# 10. Évolution prévue : configuration complémentaire

Une évolution future permettra d'ajouter une **configuration complémentaire**, sans remettre en cause le fonctionnement actuel du Core.

Cette configuration sera adaptée au :

```text
Profil technique
        +
Type d'application
```

Elle pourra notamment permettre de définir simplement certains aspects de l'interface.

### Interface

Exemples de choix :

```text
Type de navigation

○ Sidebar
○ Menu burger
○ Menu supérieur
```

### Organisation

L'utilisateur pourra définir :

* le nombre de hubs principaux ;
* le nom des hubs ;
* leur organisation ;
* les sous-hubs associés à chaque hub.

Exemple :

```text
Dashboard
 ├── Vue générale
 ├── Activité
 └── Statistiques

Projets
 ├── Tous les projets
 ├── En cours
 └── Terminés
```

Ces informations décrivent l'organisation initiale souhaitée du squelette.

Elles ne cherchent pas à définir à l'avance toute la logique fonctionnelle de l'application.

---

# 11. Thème

La configuration complémentaire pourra également définir quelques grandes orientations visuelles.

Le formulaire restera volontairement simple :

```text
Mode :

○ Sombre
○ Clair
○ Les deux

Style :

[ Sobre ▼ ]

Couleur principale : [ ■ ]

Couleur accent : [ ■ ]
```

L'objectif n'est pas de créer un outil complet de design UI.

Il s'agit de fournir au générateur suffisamment d'informations pour produire une première interface cohérente.

Le développeur pourra ensuite modifier librement le thème, le CSS et les composants générés.

---

# 12. Formulaire et Specification

Le formulaire n'est pas la source de vérité.

Il constitue une **vue permettant d'éditer la ProjectSpecification**.

```text
Utilisateur
    ↓
Formulaire
    ↓
ProjectSpecification
    ↓
Core
```

Cette distinction est importante.

L'interface peut évoluer sans imposer une modification du fonctionnement interne du Core.

Inversement, le Core doit pouvoir continuer à fonctionner avec une `ProjectSpecification` sans dépendre de l'interface graphique.

---

# 13. Rôle de l'IA

L'IA constitue une couche d'assistance située en périphérie du système.

Elle peut notamment :

* aider à transformer une intention en spécification ;
* proposer une structure de projet ;
* expliquer une architecture ;
* aider l'utilisateur à comprendre les choix disponibles.

Elle ne constitue pas l'autorité technique.

Le principe est :

```text
Utilisateur
    ↓
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
Validation / Résolution
```

L'IA peut proposer.

Le Core décide techniquement.

L'utilisateur reste le validateur final.

---

# 14. Livrable

Le résultat de SpecForge est un **squelette de projet**.

Il peut contenir notamment :

* l'architecture initiale ;
* l'organisation des répertoires ;
* les fichiers de configuration ;
* le code initial ;
* les dépendances ;
* la structure frontend/backend ;
* les bases nécessaires au fonctionnement ;
* la documentation initiale ;
* éventuellement la navigation et le thème configurés.

Le livrable n'est pas considéré comme un produit terminé.

Il constitue un point de départ destiné à être repris par un développeur.

---

# 15. Liberté du développeur

SpecForge doit éviter de verrouiller inutilement le projet généré.

Le développeur doit pouvoir :

* modifier le code ;
* remplacer une technologie ;
* modifier l'interface ;
* modifier la navigation ;
* ajouter ou supprimer des fonctionnalités ;
* réorganiser le projet ;
* faire évoluer l'architecture.

SpecForge doit donc être **prescriptif sur la cohérence de la fondation**, mais **permissif sur les évolutions futures**.

Le code généré ne doit pas nécessiter SpecForge pour continuer à être développé.

---

# 16. Architecture actuelle

```text
┌──────────────────────────────────────────┐
│                 INTERFACE                │
│                                          │
│ React / TypeScript / Tailwind            │
│ Configuration / Visualisation / Audit    │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│            APPLICATION BRIDGE             │
│                                          │
│ Node.js / Express / Vite middleware      │
│                                          │
│ Interface avec les services IA           │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│                   CORE                   │
│                                          │
│ Types                                    │
│ Registry                                 │
│ Validator                                │
│ Resolver                                 │
│ Generator                                │
│ Utils                                    │
└────────────────────┬─────────────────────┘
                     │
                     ▼
              Projet généré
```

Le Core reste indépendant de React, de l'interface et de l'IA.

---

# 17. Stack actuelle

### Frontend

* React 19
* TypeScript
* Vite
* Tailwind CSS
* Lucide
* Motion

### Application Bridge

* Node.js
* Express
* Vite middleware

### Core

* TypeScript
* YAML

Le Core ne dépend pas d'une base de données, d'un cache distribué, d'un système de messages ou d'une infrastructure complexe.

Ces composants ne doivent être introduits que lorsqu'un besoin réel et démontré le justifie.

---

# 18. Principes de conception

### Simplicité

Ne pas introduire de complexité avant qu'elle soit nécessaire.

### Déterminisme

Une même spécification et un même ensemble de briques doivent produire un résultat reproductible.

### Séparation des responsabilités

```text
UI       ≠ Core
IA       ≠ Core
Template ≠ Projet
Brique   ≠ Template
```

### Traçabilité

Les décisions du Core doivent rester compréhensibles et vérifiables.

### Extensibilité

Le système doit pouvoir accueillir de nouveaux profils, templates et briques sans refonte inutile.

### Liberté du développeur

Le résultat généré doit pouvoir évoluer indépendamment de SpecForge.

### Validation explicite

Une incohérence technique doit être signalée plutôt que masquée ou contournée.

---

# 19. Philosophie du projet

SpecForge suit une logique progressive :

```text
Construire
    ↓
Stabiliser
    ↓
Vérifier
    ↓
Étendre
```

Chaque nouvelle capacité doit répondre à un besoin identifié.

Le projet ne cherche pas à anticiper dès maintenant toutes les possibilités futures.

La complexité doit être introduite lorsque le produit en a réellement besoin.

---

# 20. Périmètre actuel

Le périmètre actuel porte principalement sur :

* la stabilisation du Core ;
* le système de briques ;
* la validation ;
* la résolution d'architecture ;
* la génération déterministe ;
* les templates Rust ;
* le modèle Profil technique × Type d'application ;
* la vérification de la génération ;
* la documentation et la maintenance du projet.

Les futurs profils Python, TypeScript et Go ne sont pas encore implémentés.

La configuration avancée UI/UX et thème constitue une évolution future et ne doit pas ralentir la stabilisation du socle actuel.

---

# 21. Définition du succès

SpecForge est utile lorsque l'utilisateur peut passer de :

```text
"Je veux créer ce type d'application"
```

à :

```text
"Voici une base technique cohérente,
déjà structurée et exploitable,
sur laquelle je peux commencer à développer."
```

Le succès du produit ne se mesure donc pas au nombre de lignes de code générées.

Il se mesure à la qualité du **point de départ fourni au développeur**.

---

# 22. Formule produit

> **SpecForge transforme une intention structurée en une architecture cohérente et en un squelette de projet exploitable, sans chercher à remplacer le développeur.**

```text
        INTENTION
            ↓
     SPECIFICATION
            ↓
       ARCHITECTURE
            ↓
        GENERATION
            ↓
   SQUELETTE EXPLOITABLE
            ↓
       DÉVELOPPEUR
            ↓
       PRODUIT FINAL
```

Le dernier élément reste volontairement hors du périmètre de SpecForge.

**SpecForge prépare le chantier. Le développeur construit le produit.**
