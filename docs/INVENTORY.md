# INVENTORY.md — Inventaire Fonctionnel des Briques

**Projet :** SpecForge
**Dernière mise à jour :** 2026-09-20
**Branche :** `feat/rust-mobile-dioxus`

> **État au 2026-09-20.** Ce document est un plan de conception historique (composition de briques). L'état réel du Core, des 17 briques et des 6 templates est décrit dans `docs/ARCHITECTURE-CORE-BRICKS-TEMPLATES.md`. Depuis ce plan, `jwt-auth`, `openapi`, `systemd-infra` et `rust-dioxus-mobile` ont été créées, et `rust-web-app` est un template autonome. Les sections ci-dessous sont conservées pour mémoire, sauf les tableaux de briques, tenus à jour.

---

## 🏁 AUDIT TERMINÉ — Phase de Conception Lancée

| Phase                               | Statut          |
| ----------------------------------- | --------------- |
| Phase 0 — Nettoyage modèle          | ✅ Terminée      |
| Phase 1 — Fondations de composition | 🚀 **EN COURS** |
| Phase 2 — Migration `rust-web-app`  | ⏳ Pending       |
| Phase 3 — Extraction capacités      | ⏳ Pending       |
| Phase 4 — Nettoyage final           | ⏳ Pending       |

---

## 🎯 Décision Architecture

**Principe :**

Conserver `BrickDefinition.generateFiles()` et ajouter un mécanisme de `contributions()` permettant aux briques de contribuer aux fichiers structurants partagés.

```text
BrickDefinition
│
├── generateFiles()       ← fichiers autonomes
│
└── contributions()      ← contributions aux fichiers partagés
         │
         ▼
Composition Engine
         │
    ┌────┴────┐
    ▼         ▼
fichiers     fichiers
autonomes    composés
```

**Contrainte :**

Un brick reste une **capacité architecturale**, pas un fichier individuel.

Les briques peuvent :

* générer leurs propres fichiers autonomes ;
* contribuer aux fichiers structurants communs ;
* déclarer les capacités qu'elles fournissent, requièrent ou excluent.

---

## 📊 État des Briques

### Briques actuellement existantes

| Brique              | Fichiers autonomes                           | Contributions à prévoir          |
| ------------------- | -------------------------------------------- | -------------------------------- |
| `rust-backend`      | `Cargo.toml`, `src/main.rs`, `src/config.rs` | Socle de `Cargo.toml`, `main.rs` |
| `python-backend`    | `requirements.txt`, `main.py`                | À traiter ultérieurement         |
| `react-vite`        | `frontend/*`                                 | À traiter ultérieurement         |
| `tauri-desktop`     | fichiers Tauri                               | À traiter ultérieurement         |
| `sqlite-storage`    | `src/db.rs`, `migrations/*`                  | `Cargo.toml`, `main.rs`          |
| `postgres-storage`  | `src/db.rs`, `migrations/*`                  | `Cargo.toml`, `main.rs`          |
| `rest-api`          | `src/api.rs`                                 | `Cargo.toml`, `main.rs`          |
| `docker-infra`      | `Dockerfile`, `docker-compose.yml`           | Aucune à ce stade                |
| `quality-suite`     | tests, CI/lint                               | Aucune à ce stade                |
| `docs-pack`         | `README.md`                                  | Aucune à ce stade                |
| `work-structure`    | structure projet                             | Aucune à ce stade                |
| `rust-web-frontend` | templates / fichiers web                     | À traiter lors de la migration   |
| `rust-web-app`      | 18 fichiers (squelette autonome)             | Aucune à ce stade                |
| `rust-dioxus-mobile` | `Cargo.toml`, `Dioxus.toml`, `src/main.rs`, `assets/main.css`, `MOBILE.md` | Aucune à ce stade |
| `jwt-auth`          | `src/auth.rs`                                | Aucune à ce stade                |
| `openapi`           | `openapi.yaml`                               | Aucune à ce stade                |
| `systemd-infra`     | `deploy/systemd/app.service`                 | Aucune à ce stade                |

---

## 🧩 Responsabilité actuelle de `rust-web-app`

`rust-web-app` est actuellement une génération monolithique intégrant plusieurs capacités :

```text
rust-web-app
├── Rust / Axum
├── Askama
├── SQLite / SQLx
├── migrations
├── REST
├── Docker
├── qualité
├── documentation
└── structure projet
```

Il ne doit donc pas être considéré comme une brique architecturale équivalente aux autres.

### Cible

À terme :

```text
rust-web-app
=
rust-backend
+ rust-web-frontend
+ sqlite-storage
+ rest-api
+ jwt-auth
+ openapi
+ docker-infra
+ systemd-infra
+ quality-suite
+ docs-pack
+ work-structure
```

`rust-web-app` devient alors une **composition prédéfinie**, et non plus un générateur autonome.

---

## 🔨 Cible Immédiate — Jalon 1

**Objectif :**

Faire produire par composition un projet fonctionnel équivalent au socle actuel :

```text
rust-backend
+ sqlite-storage
+ rest-api
```

sans utiliser le générateur monolithique `rust-web-app`.

### Ordre d'implémentation

1. ⏳ Introduire le concept minimal de contribution
2. ⏳ Faire fonctionner la composition sur `Cargo.toml`
3. ⏳ Adapter `rust-backend` pour fournir le socle
4. ⏳ Adapter `sqlite-storage` pour contribuer
5. ⏳ Adapter `rest-api` pour contribuer
6. ⏳ Générer un projet complet par composition
7. ⏳ Vérifier compilation et comportement
8. ⏳ Ensuite seulement créer `jwt-auth`, `openapi`, `systemd-infra`

---

## 🧱 Modèle de Contribution Proposé

Structure minimale :

```typescript
interface BrickContribution {
  // Fichier structurant auquel la brique contribue
  targetFile: string;

  // Stratégie de composition
  strategy: string;

  // Données de contribution
  content: unknown;
}

interface BrickDefinition {
  id: string;
  name: string;

  generateFiles(): GeneratedFile[];

  contributions(): BrickContribution[];

  provides: string[];
  requires?: string[];
  conflictsWith?: string[];
  compatibleWith?: string[];
}
```

### Principe

`generateFiles()` reste responsable des fichiers autonomes.

`contributions()` est utilisé lorsque plusieurs briques doivent participer au même fichier structurant.

Le `CompositionEngine` devient responsable de la fusion et de la validation des contributions.

---

## 🔧 Stratégies de composition initiales

| Fichier         | Stratégie envisagée  | Exemple                          |
| --------------- | -------------------- | -------------------------------- |
| `Cargo.toml`    | `merge-toml`         | Fusion des dépendances           |
| `src/main.rs`   | `append-mods`        | Ajout de `mod api;`, `mod db;`   |
| `src/main.rs`   | stratégie structurée | Ajout de routes / initialisation |
| `src/config.rs` | stratégie structurée | Extension de configuration       |
| `.env.example`  | `append-lines`       | Variables d'environnement        |

Les stratégies exactes seront définies progressivement selon les besoins réels de composition.

**Ne pas figer prématurément un mécanisme générique de type `extend-function`.**

---

## ⚠️ Contributions Attendues — Jalon 1

### `rust-backend`

| Fichier         | Stratégie                    | Responsabilité                      |
| --------------- | ---------------------------- | ----------------------------------- |
| `Cargo.toml`    | `create-base` / `merge-toml` | Socle du projet et dépendances Rust |
| `src/main.rs`   | `create-base`                | Skeleton serveur Axum               |
| `src/config.rs` | `create-file`                | Configuration de base               |

### `sqlite-storage`

| Fichier        | Stratégie               | Responsabilité                    |
| -------------- | ----------------------- | --------------------------------- |
| `Cargo.toml`   | `merge-toml`            | Dépendance SQLx + features SQLite |
| `src/db.rs`    | `create-file`           | Initialisation SQLite             |
| `migrations/*` | `create-file`           | Migrations SQL                    |
| `src/main.rs`  | contribution structurée | Déclaration / initialisation DB   |

### `rest-api`

| Fichier       | Stratégie               | Responsabilité                   |
| ------------- | ----------------------- | -------------------------------- |
| `Cargo.toml`  | `merge-toml`            | Dépendances REST / sérialisation |
| `src/api.rs`  | `create-file`           | Handlers et modèles REST         |
| `src/main.rs` | contribution structurée | Module API et routes             |

---

## 🔮 Contributions Futures

### `jwt-auth`

Créée (voir le tableau des briques). Plan initial conservé ci-dessous.

Responsabilités envisagées :

| Fichier       | Responsabilité                 |
| ------------- | ------------------------------ |
| `Cargo.toml`  | `jsonwebtoken`, `argon2`, etc. |
| `src/auth.rs` | logique d'authentification     |
| `src/main.rs` | module et middleware           |
| configuration | secrets / durée des tokens     |

### `openapi`

Créée (voir le tableau des briques). Plan initial conservé ci-dessous.

Responsabilités envisagées :

| Fichier          | Responsabilité                 |
| ---------------- | ------------------------------ |
| `Cargo.toml`     | `utoipa`, UI éventuelle        |
| `src/openapi.rs` | définition du contrat          |
| `src/main.rs`    | exposition de la documentation |
| `openapi.yaml`   | éventuellement généré          |

### `systemd-infra`

Créée (voir le tableau des briques). Plan initial conservé ci-dessous.

Responsabilité principale :

```text
/etc/systemd/system/<application>.service
```

ou équivalent généré dans le projet.

---

## 🎯 Premier Cas de Test — Fusion `Cargo.toml`

### Scénario

Contributions :

```text
rust-backend
  axum
  tokio

sqlite-storage
  sqlx

rest-api
  serde
  serde_json
```

### Résultat attendu

```toml
[dependencies]
axum = "0.7"
tokio = "1.0"
sqlx = "0.7"
serde = "1.0"
serde_json = "1.0"
```

avec les features réellement nécessaires déclarées sans duplication.

### Validation

Le moteur doit garantir :

* aucune dépendance perdue ;
* aucune duplication ;
* fusion correcte des sections TOML ;
* détection des conflits de versions ;
* résultat TOML valide.

La politique exacte de résolution des versions reste à définir.

---

## 📝 Historique des Décisions

| Date       | Décision                                   | Justification                                                                                       |
| ---------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 2026-09-18 | Phase 0 : nettoyage du modèle              | Suppression de rate limiting, GraphQL, OAuth, Telegram, nginx et VPS scripts                        |
| 2026-09-18 | PostgreSQL conservé comme brique existante | Le problème identifié concerne surtout son intégration avec REST                                    |
| 2026-09-18 | `quality-suite` = tests + lint + CI        | Regroupement intentionnel                                                                           |
| 2026-09-18 | `rust-web-app` = composition cible         | Le générateur actuel est monolithique et porte plusieurs responsabilités                            |
| 2026-09-18 | Authentication = JWT uniquement            | Simplification du périmètre                                                                         |
| 2026-09-18 | Unification des moteurs d'architecture     | Les deux modèles de génération doivent converger                                                    |
| 2026-09-18 | Templates = compositions de briques        | Changement progressif de responsabilité                                                             |
| 2026-09-18 | Composition partagée                       | Les briques doivent pouvoir collaborer sur les fichiers structurants                                |
| 2026-09-18 | Conservation de `generateFiles()`          | Évolution progressive sans refactoring global immédiat                                              |
| 2026-09-18 | Ajout de `contributions()`                 | Permettre la composition de fichiers structurants                                                   |
| 2026-09-18 | Jalon 1 : `Cargo.toml` d'abord             | Preuve de concept minimale avant de traiter `main.rs`                                               |
| 2026-09-18 | Nouvelles briques après la fondation       | JWT, OpenAPI et systemd ne doivent pas être construits sur une mécanique de composition non validée |

---

## 🛠️ Prochaines Tâches Techniques

| Tâche                              | Description                               | Priorité   |
| ---------------------------------- | ----------------------------------------- | ---------- |
| 1. Définir `BrickContribution`     | Interface TypeScript minimale             | 🔴 Haute   |
| 2. Implémenter `CompositionEngine` | Première stratégie : `merge-toml`         | 🔴 Haute   |
| 3. Adapter `rust-backend`          | Définir le socle composable               | 🟡 Moyenne |
| 4. Adapter `sqlite-storage`        | Contribuer à `Cargo.toml` et `main.rs`    | 🟡 Moyenne |
| 5. Adapter `rest-api`              | Contribuer aux dépendances et au router   | 🟡 Moyenne |
| 6. Générer le socle composé        | Remplacer progressivement le monolithe    | 🟡 Moyenne |
| 7. Compiler / tester               | Vérifier le projet généré                 | 🟡 Moyenne |
| 8. Migrer `rust-web-app`           | Utiliser uniquement les briques composées | 🟡 Moyenne |
| 9. Créer `jwt-auth`                | Après validation de la composition        | 🟢 Ensuite |
| 10. Créer `openapi`                | Après validation de la composition        | 🟢 Ensuite |
| 11. Créer `systemd-infra`          | Après validation de la composition        | 🟢 Ensuite |

---

## ❓ Questions Techniques en Suspens

| Question                             | Réponse à déterminer                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| **Library TOML ?**                   | `toml` crate + fusion structurée ou autre solution                        |
| **Conflits de versions ?**           | Politique explicite à définir                                             |
| **Ordre des contributions ?**        | Dépendances / ordre déterministe à définir                                |
| **Création initiale d'un fichier ?** | Identifier un propriétaire de base unique                                 |
| **Contributions `main.rs` ?**        | Définir une représentation structurée plutôt qu'un simple append de texte |
| **Rollback de migration ?**          | Conserver temporairement l'ancien générateur si nécessaire                |
| **Validation des collisions ?**      | À intégrer au moteur de composition                                       |

---

## 🎯 Prochaine Étape

**Débuter la Phase 1 — Fondations de composition.**

1. Définir `BrickContribution`
2. Implémenter `CompositionEngine` minimal
3. Tester `Cargo.toml` sur `rust-backend + sqlite-storage + rest-api`
4. Corriger le modèle selon les résultats
5. Seulement ensuite étendre la composition à `main.rs`

---

*INVENTORY.md — Référence de conception pour la migration progressive vers une architecture composée.*

---

## 📋 Synthèse

| Aspect                              | État                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| **Audit**                           | ✅ Terminé                                                |
| **Briques actuellement présentes**  | 13                                                       |
| **Briques nouvelles identifiées**   | 3 principales : JWT, OpenAPI, systemd                    |
| **Changement architectural majeur** | Composition et contributions entre briques               |
| **Priorité absolue**                | `CompositionEngine`                                      |
| **Premier jalon**                   | Fusion `Cargo.toml`                                      |
| **Migration**                       | Progressive, en commençant par `rust-web-app`            |
| **Nouvelle règle**                  | Une brique = une capacité architecturale, pas un fichier |
| **Statut actuel**                   | Phase 1 — fondations de composition                      |
