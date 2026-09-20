# Changelog

Toutes les modifications notables du projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [1.0.0] - 2026-09-20

### Ajouté

#### Templates
- Template Rust Mobile (Dioxus 0.6/0.7) avec UI responsive et dark theme
- Support complet de 6 templates fonctionnels :
  - Rust Web App (Rust + Axum + SQLite + Askama)
  - Rust Web Platform (Rust + Axum + PostgreSQL + React)
  - Rust Web Frontend (Rust + Askama frontend seul)
  - Rust Backend Only (Rust + Axum)
  - Rust Desktop (Rust + Tauri + React + SQLite)
  - Rust Mobile (Rust + Dioxus)

#### Briques
- `rust-dioxus-mobile` — Template mobile propriétaire
- `jwt-auth` — Authentification JWT stateless
- `openapi` — Documentation API OpenAPI
- `systemd-infra` — Service systemd Linux

#### Fonctionnalités
- Validation d'identifiant Reverse-DNS pour projets mobiles
- Champ Bundle ID dans le wizard (généré automatiquement)
- Assets icônes base64 intégrés
- Documentation MOBILE.md générée avec commandes `dx bundle`

#### Documentation
- `ARCHITECTURE-CORE-BRICKS-TEMPLATES.md` — Architecture complète
- `INVENTORY.md` — Inventaire des 17 briques
- `TRACKING.md` — Suivi d'avancement
- `FICHE-PRODUIT.md` — Vue produit SpecForge
- `INFRASTRUCTURE.md` — Infrastructure et déploiement
- `ROADMAP.md` — Roadmap d'évolution
- `MAINTENANCE-EVOLUTION.md` — Maintenance et évolution
- `SpecForge-Templates-référence-V1.md` — Référence des templates

### Modifié

#### Core
- Resolver : correction regression pour `rust-web-frontend` (sélectionné uniquement pour `framework: askama`)
- Generator : améliorations divers
- Validator : règles mobiles ajoutées (identifiant requis/format/warning)
- Presets : `docker: false` pour `react-frontend-only` (pas de backend)

#### UI/UX
- Wizard : champ identifiant dynamique pour Mobile
- Header : liens navigation améliorés
- App : modifications mineures

### Corrigé

- Bug `react-frontend-only` preset INVALID → fix resolver + presets
- Documentation alignée sur état réel (17 briques, 6 templates)
- Favicon specforge généralisé
- Shims inutilisés documentés

### Architecture

| Composant | Quantité | Statut |
|-----------|----------|--------|
| Briques | 17 | ✅ Fonctionnelles |
| Templates | 6 | ✅ Finalisés |
| Presets | 7 | ✅ Valides |
| Documentation | 8 fichiers | ✅ Alignée |

### Représentabilité

- Génération reproductible vérifiée (hash identiques)
- Aucun doublon de chemin dans les scaffolds
- Aucun caractère `§` résiduel
- Build Vite + Esbuild passent

### Technologique

- Stack principale : TypeScript (Core), Rust (scaffolds), React (UI)
- Mobile : Dioxus 0.6/0.7
- Desktop : Tauri
- Backend : Axum (Rust), FastAPI (Python)
- Database : SQLx + SQLite/PostgreSQL
- CI/CD : GitHub Actions

### Non inclus (dette technique)

- ZIP non reproductible (horodatage JSZip)
- Double lockfile (`bun.lock` + `package-lock.json`)
- Support Docker frontend statique
- Scripts `test` dans `package.json`
- Shims `src/engine/*` inutilisés

---

## [0.1.0] - 2024-[Date inconnue]

### Ajouté
- Import initial du prototype SpecForge avec Core
- Structure de base du projet

---

## Historique des Versions

| Version | Date | État | Notes |
|---------|------|------|-------|
| 1.0.0 | 2026-09-20 | 🟢 Production | Release complète, 6 templates |
| 0.1.0 | 2024 | 🟡 Prototype | Import initial |

---

## Liens

- [Architecture](docs/ARCHITECTURE-CORE-BRICKS-TEMPLATES.md)
- [Inventory](docs/INVENTORY.md)
- [Tracking](docs/TRACKING.md)
- [Roadmap](docs/ROADMAP.md)
- [Templates Reference](docs/SpecForge-Templates-référence-V1.md)
