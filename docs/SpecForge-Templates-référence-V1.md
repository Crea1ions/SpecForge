# SpecForge — 6 Templates de référence V1

## 1. Web Frontend

### Finalité

Application web frontend autonome consommant une API externe.

### Architecture

SPA statique découplée du backend.

### Stack

* React
* TypeScript
* Vite
* Tailwind CSS
* REST / JSON

### Composants obligatoires

* React application
* Routing
* API client
* Configuration environnement
* Gestion des états UI
* Tests
* Lint / formatage
* Documentation

### Composants optionnels

* TanStack Query
* Zustand
* OpenAPI client
* Playwright
* PWA

### Hors modèle

* Backend
* Base de données
* ORM
* Migrations
* Authentification serveur
* Docker
* SSR
* Infrastructure serveur

---

## 2. Web App

### Finalité

Application web complète destinée à un usage opérationnel avec données persistantes.

### Architecture

Monolithe applicatif séparant frontend et backend, avec déploiement simple.

```text
React
  ↓ REST
Axum
  ↓
SQLite
```

### Stack

* React
* TypeScript
* Vite
* Tailwind CSS
* Rust
* Axum
* Tokio
* SQLx
* SQLite
* REST / JSON

### Composants obligatoires

* Frontend React
* Backend Rust/Axum
* API REST
* Configuration
* SQLite
* Migrations
* Pool SQLx
* Gestion d'erreurs
* Tests
* Lint / formatage
* Documentation

### Composants optionnels

* Authentification
* OpenAPI
* WebSocket / SSE
* Docker
* CI/CD

### Hors modèle

* PostgreSQL
* Redis
* Microservices
* Kubernetes
* Architecture distribuée
* Infrastructure complexe

---

## 3. Web Platform

### Finalité

Application web multi-utilisateurs nécessitant une base serveur et une séparation plus nette entre frontend et backend.

### Architecture

```text
React
  ↓ REST
Axum
  ↓
PostgreSQL
```

Frontend et backend peuvent être déployés indépendamment.

### Stack

* React
* TypeScript
* Vite
* Tailwind CSS
* Rust
* Axum
* Tokio
* SQLx
* PostgreSQL
* REST / JSON

### Composants obligatoires

* Frontend React
* Backend Rust/Axum
* API REST
* PostgreSQL
* Migrations
* Pool SQLx
* Configuration
* Gestion d'erreurs
* Tests
* Lint / formatage
* CI
* Documentation

### Composants optionnels

* Authentification
* OpenAPI
* Docker / Compose
* Reverse proxy
* WebSocket / SSE
* Monitoring

### Hors modèle

* Microservices
* Micro-frontends
* Kubernetes
* Message broker
* Architecture distribuée complexe

---

## 4. API Service

### Finalité

Backend autonome exposant une API à des applications clientes.

### Architecture

```text
Client(s)
    ↓ REST
Axum
    ↓
SQLite / PostgreSQL
```

### Stack

* Rust
* Axum
* Tokio
* SQLx
* REST / JSON
* SQLite par défaut

PostgreSQL lorsque la configuration du projet le nécessite.

### Composants obligatoires

* Serveur HTTP
* Routes / handlers
* Configuration
* Gestion d'erreurs
* Validation des entrées
* Persistance
* Migrations
* Tests
* Lint / formatage
* Documentation API

### Composants optionnels

* PostgreSQL
* OpenAPI
* Authentification
* Rate limiting
* WebSocket / SSE
* Docker
* CI

### Hors modèle

* Frontend
* SSR
* Microservices
* Kubernetes
* Message broker
* Infrastructure complexe

---

## 5. Desktop App

### Finalité

Application desktop locale installable, fonctionnant principalement hors ligne.

### Architecture

```text
React
  ↓ Tauri IPC
Rust / Tauri
  ↓
SQLite
```

Le Rust de Tauri constitue le **core applicatif**. Il ne s'agit pas d'un backend HTTP indépendant.

### Stack

* Tauri 2
* Rust
* React
* TypeScript
* Vite
* Tailwind CSS
* SQLite
* SQLx
* IPC Tauri

### Composants obligatoires

* Application Tauri
* Frontend React
* Core Rust
* Communication IPC
* SQLite
* Migrations
* Configuration
* Gestion d'erreurs
* Tests
* Lint / formatage
* Documentation

### Composants optionnels

* Notifications système
* Tray
* Auto-update
* Accès fichiers
* Synchronisation avec une API distante

### Hors modèle

* Backend Axum séparé
* Serveur HTTP local obligatoire
* PostgreSQL local
* Docker
* Kubernetes
* Infrastructure serveur

---

## 6. Mobile App

### Finalité

Application mobile installable destinée principalement à Android/iOS.

### Architecture

```text
React Native / Expo
       ↓
API distante éventuelle
       +
Stockage local
```

L'application mobile ne contient pas de backend Rust embarqué.

### Stack

* React Native
* Expo
* TypeScript
* Expo Router
* SQLite local si nécessaire
* API REST si nécessaire

### Composants obligatoires

* Application React Native
* Navigation
* Configuration Expo
* Gestion de l'état de l'application
* Gestion réseau
* Stockage local minimal
* Gestion des erreurs
* Tests
* Documentation

### Composants optionnels

* Authentification
* API REST
* SQLite
* Notifications
* Offline-first
* Synchronisation
* Secure Storage
* EAS Build

### Hors modèle

* Backend embarqué
* Rust embarqué par défaut
* PostgreSQL embarqué
* Docker
* Kubernetes
* Infrastructure serveur
* Microservices

---

# Synthèse V1

| Modèle           | Frontend            | Backend/Core | DB         | Communication |
| ---------------- | ------------------- | ------------ | ---------- | ------------- |
| **Web Frontend** | React               | —            | —          | REST externe  |
| **Web App**      | React               | Rust / Axum  | SQLite     | REST          |
| **Web Platform** | React               | Rust / Axum  | PostgreSQL | REST          |
| **API Service**  | —                   | Rust / Axum  | SQLite*    | REST          |
| **Desktop App**  | React / Tauri       | Rust / Tauri | SQLite     | IPC           |
| **Mobile App**   | React Native / Expo | —            | SQLite*    | REST*         |

* Optionnel selon le modèle.

## Principe V1

Ces six templates ne cherchent pas à couvrir toutes les architectures possibles.

Ils constituent le **socle minimal de référence de SpecForge**.

Les architectures plus complexes pourront être ajoutées ultérieurement sous forme de nouveaux templates, sans modifier la définition fondamentale des six modèles V1.
