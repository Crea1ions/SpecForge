# SpecForge — Roadmap

**Version :** 1.0
**Statut :** Prototype fonctionnel — fondation V1
**Principe :** Stabiliser avant d'étendre

---

# 1. Principe de développement

SpecForge évolue par étapes courtes et vérifiables.

```text
Besoin identifié
      ↓
Investigation ciblée
      ↓
Modification minimale
      ↓
Build / Vérification
      ↓
Validation
      ↓
Checkpoint / Commit
      ↓
Étape suivante
```

Le projet ne doit pas chercher à implémenter plusieurs couches simultanément.

La priorité est de conserver un Core fiable avant d'ajouter de nouvelles capacités.

---

# 2. État actuel

## Fondation Core

**Statut : TERMINÉ**

* [x] Extraction du Core hors de l'interface
* [x] Types centralisés
* [x] Registry de briques
* [x] Validator
* [x] Resolver
* [x] Generator
* [x] Fonctions utilitaires
* [x] Génération déterministe
* [x] Calcul de hash
* [x] Façade Core
* [x] Compatibilité avec les anciens imports
* [x] Build fonctionnel

---

## Modèle Profil × Type d'application

**Statut : TERMINÉ — première version**

* [x] Introduction du profil technique
* [x] Introduction du type d'application
* [x] Séparation Profil technique / Type d'application
* [x] Recherche de template par `profile + template`
* [x] Sélecteur de profil dans le Header
* [x] Sélecteur des six types d'application
* [x] Gestion des templates indisponibles
* [x] Conservation de Rust comme seul profil réellement implémenté

Types actuellement prévus :

```text
Web Frontend
Web App
Web Platform
API Service
Desktop
Mobile
```

---

## Templates Rust

**Statut : EN COURS**

Templates actuellement disponibles :

* [x] Rust + React + SQLite — Web App
* [x] Rust + React + PostgreSQL — Web Platform
* [x] Rust + Tauri + React — Desktop
* [x] Rust Backend Only — API Service
* [ ] Rust Web Frontend
* [ ] Rust Mobile

Les templates absents ne doivent pas être simulés comme disponibles.

---

# 3. Phase suivante — Stabilisation du Core

**Priorité : IMMÉDIATE**

Avant d'ajouter de nouvelles fonctions de configuration, terminer la consolidation du socle.

### 3.1 Inventaire des briques

* [ ] Inventorier les briques actuellement présentes
* [ ] Identifier les capacités couvertes
* [ ] Identifier les capacités réellement manquantes
* [ ] Identifier les briques inutilisées ou incohérentes
* [ ] Vérifier les dépendances et conflits

Cette phase doit rester descriptive dans un premier temps.

Aucune refonte globale sans besoin identifié.

---

### 3.2 Authentification

Le Core détecte actuellement les demandes d'authentification non supportées.

Objectif :

```text
authentication
      ↓
brique correspondante
      ↓
architecture résolue
      ↓
génération
```

Travail prévu :

* [ ] Définir les capacités d'authentification réellement supportées
* [ ] Ajouter les briques nécessaires
* [ ] Intégrer leur résolution au Registry
* [ ] Vérifier les dépendances
* [ ] Vérifier les conflits
* [ ] Tester la validation
* [ ] Tester la résolution
* [ ] Tester la génération

Ne pas multiplier les providers tant qu'un besoin concret ne le justifie pas.

---

### 3.3 Vérification de bout en bout

Pour chaque template réellement disponible :

```text
ProjectSpecification
        ↓
Validator
        ↓
Resolver
        ↓
ResolvedArchitecture
        ↓
Generator
        ↓
Projet généré
```

* [ ] Vérifier les erreurs de validation
* [ ] Vérifier les briques activées
* [ ] Vérifier les fichiers générés
* [ ] Vérifier la cohérence des chemins
* [ ] Vérifier la reproductibilité
* [ ] Vérifier les archives générées
* [ ] Documenter les éventuels écarts

---

# 4. Phase suivante — Templates Rust

Une fois le Core suffisamment stable.

## 4.1 Rust Web Frontend

Objectif : fournir un vrai template Rust pour le type :

```text
Rust + Web Frontend
```

Direction envisagée :

```text
Rust / Axum
    +
HTML
HTMX
JavaScript léger
CSS
```

Le choix exact des briques devra être validé au moment de l'implémentation.

Travail :

* [ ] Définir le template
* [ ] Définir les briques nécessaires
* [ ] Ajouter le preset
* [ ] Adapter la génération
* [ ] Vérifier le résultat
* [ ] Tester le build généré

---

## 4.2 Rust Mobile

Objectif : définir un vrai template :

```text
Rust + Mobile
```

Le choix de la technologie mobile reste à déterminer.

* [ ] Identifier une approche réaliste
* [ ] Définir les responsabilités Rust / interface mobile
* [ ] Définir les briques nécessaires
* [ ] Créer le template
* [ ] Vérifier la génération

Cette étape ne doit pas être engagée tant que l'architecture n'est pas suffisamment claire.

---

# 5. Phase — Stabilisation du système de templates

Après l'extension des templates Rust :

* [ ] Vérifier la cohérence de `PRESETS`
* [ ] Vérifier que chaque preset correspond à un template réellement générable
* [ ] Séparer progressivement les informations génériques des valeurs d'exemple si nécessaire
* [ ] Vérifier la cohérence `profile + template`
* [ ] Vérifier les transitions entre templates
* [ ] Éviter la duplication inutile entre presets

Le système existant doit être conservé tant qu'il reste suffisamment simple.

Pas de nouvelle couche de registry de templates sans besoin démontré.

---

# 6. Phase — Configuration complémentaire

**Statut : FUTUR**

Cette phase intervient seulement lorsque le socle actuel est suffisamment stable.

Elle ne remplace pas le système actuel.

Elle vient enrichir la `ProjectSpecification`.

```text
Profil technique
        +
Type d'application
        ↓
Configuration adaptée
        ↓
ProjectSpecification
        ↓
Core
```

---

## 6.1 Configuration de l'interface

Ajouter un formulaire simple permettant de définir :

### Navigation

* [ ] Sidebar
* [ ] Menu burger
* [ ] Menu supérieur
* [ ] Autres choix pertinents selon le type d'application

### Organisation

* [ ] Nombre de hubs principaux
* [ ] Nom des hubs
* [ ] Sous-hubs par hub
* [ ] Ajout / suppression d'un sous-hub
* [ ] Renommage des éléments

Le formulaire doit rester simple.

Il ne doit pas chercher à définir toute la logique fonctionnelle de l'application.

---

## 6.2 Configuration du thème

Ajouter quelques choix visuels simples :

* [ ] Mode sombre
* [ ] Mode clair
* [ ] Les deux
* [ ] Style général
* [ ] Couleur principale
* [ ] Couleur d'accent

La configuration doit produire une intention visuelle structurée.

Elle ne doit pas devenir un éditeur CSS complet.

---

## 6.3 Adaptation au profil et au type

Le contenu du formulaire doit dépendre du contexte :

```text
Rust + Web App
        ↓
Formulaire Web App

Rust + Desktop
        ↓
Formulaire Desktop

Rust + API Service
        ↓
Formulaire API
```

Les options doivent donc être pertinentes pour le projet sélectionné.

---

# 7. Phase — Génération enrichie

Une fois la configuration complémentaire disponible :

```text
Specification
      +
Interface
      +
Organisation
      +
Thème
      ↓
ProjectSpecification
      ↓
Core
      ↓
Architecture
      ↓
Generation
```

Le générateur pourra alors produire un squelette davantage pré-configuré.

Exemples :

* structure de navigation ;
* hubs ;
* sous-hubs ;
* composants initiaux ;
* thème ;
* tokens visuels ;
* organisation des fichiers.

L'objectif reste de fournir un **point de départ**, pas une application terminée.

---

# 8. Phase future — Nouveaux profils techniques

Lorsque le modèle Rust sera suffisamment stable :

* [ ] Python
* [ ] TypeScript
* [ ] Go

Pour chaque nouveau profil :

```text
Profil
   ↓
Templates
   ↓
Briques compatibles
   ↓
Validation
   ↓
Résolution
   ↓
Génération
```

Un nouveau profil ne doit pas nécessiter de modifier inutilement les fondations du Core.

---

# 9. IA

L'IA reste une couche d'assistance.

Évolutions possibles :

* [ ] Améliorer `intent-to-spec`
* [ ] Améliorer l'explication d'architecture
* [ ] Permettre à l'IA de proposer une configuration complémentaire
* [ ] Faire valider systématiquement les propositions par le Core
* [ ] Conserver l'utilisateur comme validateur final

Principe permanent :

```text
IA = proposition
Core = autorité technique
Utilisateur = validation finale
```

L'IA ne doit pas devenir un orchestrateur autonome du Core.

---

# 10. Qualité et maintenance

À chaque évolution significative :

* [ ] `npm run build`
* [ ] Vérification du statut Git
* [ ] Vérification du diff
* [ ] Vérification de la génération concernée
* [ ] Vérification des erreurs Core
* [ ] Checkpoint
* [ ] Commit

Lorsque cela est pertinent :

* [ ] Test de résolution
* [ ] Test de génération
* [ ] Test de reproductibilité
* [ ] Vérification de l'archive générée

---

# 11. Hors périmètre immédiat

Les éléments suivants ne doivent pas être introduits sans besoin réel :

* base de données pour SpecForge lui-même ;
* Redis ;
* système de messages ;
* architecture distribuée ;
* infrastructure cloud complexe ;
* agents autonomes ;
* orchestration multi-agents ;
* génération de produit complet ;
* système de design complet ;
* éditeur graphique complexe ;
* compatibilité exhaustive de tous les profils.

Le principe est :

> **Ne pas construire aujourd'hui l'infrastructure nécessaire à un problème qui n'existe pas encore.**

---

# 12. Ordre de priorité

L'ordre général de développement est :

```text
                    ┌─────────────────────┐
                    │  CORE STABLE        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  BRIQUES MANQUANTES │
                    │  + AUTHENTIFICATION │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ TEMPLATES RUST      │
                    │                     │
                    │ Web Frontend        │
                    │ Mobile              │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ CONFIGURATION       │
                    │ COMPLÉMENTAIRE      │
                    │                     │
                    │ Interface           │
                    │ Hubs / Sous-hubs    │
                    │ Thème               │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ GÉNÉRATION ENRICHIE │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ NOUVEAUX PROFILS    │
                    │                     │
                    │ Python              │
                    │ TypeScript          │
                    │ Go                  │
                    └─────────────────────┘
```

---

# 13. Critère de progression

Une phase est considérée comme suffisamment avancée lorsqu'elle est :

* fonctionnelle ;
* compréhensible ;
* vérifiable ;
* suffisamment stable pour servir de fondation à la phase suivante.

Il n'est pas nécessaire d'obtenir une perfection théorique avant de progresser.

Mais une nouvelle couche ne doit pas masquer une instabilité de la couche précédente.

---

# 14. Vision de progression

SpecForge doit progressivement passer de :

```text
Définir une architecture
        ↓
Générer un squelette
```

à :

```text
Définir le projet
        ↓
Définir quelques choix structurants
        ↓
Résoudre l'architecture
        ↓
Générer un squelette cohérent
        ↓
Développeur
        ↓
Produit final
```

La génération devient progressivement plus riche sans transformer SpecForge en générateur de produits finis.

---

# 15. Règle directrice

> **Stabiliser ce qui existe avant d'ajouter ce qui manque.**

Et pour chaque nouvelle capacité :

> **Si elle peut être ajoutée simplement, elle est ajoutée.
> Si elle nécessite une complexité disproportionnée, elle attend qu'un besoin réel la justifie.**

---

**Fin de la roadmap.**
