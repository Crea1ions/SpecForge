# SpecForge — Tracking

## Core
- [x] Extraction Core
- [x] Types centralisés
- [x] Registry des briques
- [x] Validator
- [x] Resolver
- [x] Generator
- [x] Génération déterministe
- [x] Hash
- [x] Facade Core
- [x] Compatibilité anciens imports
- [x] Build

## Profils × Templates
- [x] Profil technique
- [x] Type d'application
- [x] Séparation profil / template
- [x] Lookup profil + template
- [x] Sélecteur de profil
- [x] Sélecteur des templates
- [x] Templates indisponibles
- [x] Profil Rust

## Templates Rust
- [x] Finaliser Rust Web App
- [x] Auditer Rust Web Platform
- [x] Finaliser Rust Web Platform
- [x] Auditer Rust Web Frontend
- [x] Finaliser Rust Web Frontend
- [x] Auditer Rust Backend Only
- [x] Finaliser Rust Backend Only
- [x] Auditer Rust Desktop
- [x] Finaliser Rust Desktop
- [x] Rust Mobile

## Rust Web App
- [x] Backend Rust
- [x] Axum / Tokio
- [x] Askama
- [x] SQLite / SQLx
- [x] HTML / CSS / JavaScript vanilla
- [x] Briques cohérentes
- [x] ADRs
- [x] Architecture résolue
- [x] Génération
- [x] Audit final
- [x] Validation projet généré
- [x] Décision UI/UX finale

## Rust Web Platform
- [x] Audit de la spec
- [x] Audit du preset
- [x] Audit des briques
- [x] Audit dépendances / conflits
- [x] Audit Resolver
- [x] Audit Generator
- [x] Génération réelle
- [x] Build du projet généré
- [x] Audit UI/UX
- [x] Corrections ciblées
- [x] Validation finale

## Stabilisation Templates
- [x] Cohérence des presets
- [x] Chaque preset correspond à un template réel
- [x] Cohérence profil × template
- [x] Vérification génération de bout en bout
- [x] Vérification reproductibilité
- [ ] Vérification archives (ZIP non reproductible octet par octet : JSZip horodate chaque entrée ; non corrigé, jugé non prioritaire)

## Configuration
- [ ] Interface
- [ ] Organisation
- [ ] Thème
- [ ] Adaptation profil × template

## Profils futurs
- [ ] Python
- [ ] TypeScript
- [ ] Go

## IA
- [ ] Intent → Spec
- [ ] Explication architecture
- [ ] Suggestions de configuration
- [ ] Validation systématique par Core

## Maintenance
- [ ] Build après évolution
- [ ] Tests
- [ ] Génération
- [ ] Vérification des erreurs Core
- [ ] Checkpoint / commit

## Évolutions identifiées (audit du 2026-09-20)

### Corrigées pendant l'audit
- [x] Resolver : `rust-web-frontend` n'est choisi que pour `framework: askama` (le preset `react-frontend-only` résolvait la mauvaise brique)
- [x] Preset `react-frontend-only` : `docker: false` (aucune brique ne fournit `backend_runtime`)
- [x] `MOBILE.md` généré : commandes `dx bundle` documentées (syntaxe vérifiée sur l'aide de dx 0.7.10, build non testé)

### À traiter
- [ ] Support Docker d'un frontend statique (sans backend, `docker-infra` génère un Dockerfile placeholder)
- [ ] `docker-infra` : `react-vite` est dans `compatibleWith` mais la brique exige `backend_runtime`
- [ ] Supprimer les shims `src/engine/{bricks,generator,resolver}.ts` (aucun import détecté, seul `engine/presets.ts` est utilisé)
- [ ] Double lockfile `bun.lock` / `package-lock.json` : n'en garder qu'un
- [ ] `rust-web-app` est classée `frontend` dans le registre
- [ ] `BrickRegistry.clone()` : commentaire « deep copy » mais copie superficielle
- [ ] Aucune brique pour le profil `go`, le type `cli` et le framework `vue`
- [ ] Aucun script `test` dans `package.json`
