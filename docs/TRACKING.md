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

## Refactoring data-driven (C0–C8)

### Préparation
- [x] C0a — `scripts/check-golden.ts` (premier test du projet, committé)
- [x] C0b — Suppression des ponts morts `engine/{bricks,generator,resolver}.ts`
- [x] C0c — `scripts/check-graph.ts` (snapshot graphe/issues/ADR, 7 presets + 2912 variantes)
- [x] C0d — Éclatement `default-bricks.ts` → 1 fichier par brique (17 briques)
- [x] C0e — Éclatement `presets.ts` → `engine/presets/` (1 preset par fichier)

### Découplage du moteur
- [x] C1 — `SpecPattern` + `matchesSpec` (type + fonction pure, 14 cas testés)
- [x] C2 — `applies` / `subsumes` déclarés sur les 17 briques (`layer` complété en C8c)
- [x] C3 — Bascule du resolver sur `selectByData` (plus de `selectSkeleton` codé en dur)
- [x] C4 — `links` sur les briques, graphe dérivé (plus de `hasBrick(...)` codé en dur)
- [x] C5a — `backendStack` sur `rust-backend`, règle validator générique
- [x] C5b — `backendStack` sur `python-backend` (`fastapi`), nouvelles erreurs jugées (216)
- [x] C6a — Extraction des helpers purs de `ProjectWizard` → `src/core/spec-edit.ts`
- [x] C6b — Dérivation des langages et frameworks du wizard depuis le registre

### Nettoyage
- [x] C8a — Suppression `BrickDefinition.compatibleWith` (donnée morte)
- [x] C8b — Suppression `BrickDefinition.options` + `BrickOption` (donnée morte, `actix-web` retiré)
- [x] C8c — `layer` obligatoire sur les 17 briques, retrait du `switch` de `getBrickLayer`

### Prochaine étape
- [ ] Chantier TypeScript — V1 minimale (1 brique `typescript-backend` + 1 preset `api-service` + test compile)
- [ ] Chantier TypeScript — Itération (5 autres templates)
- [ ] Chantier Python — V1 minimale + itération
- [ ] Chantier Go — V1 minimale + itération

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

## Dette de test à traiter (D3)
- [ ] Test de garde des barrels (`bricks/index.ts`, `presets/index.ts`)
- [ ] Réintégrer la couverture de sélection (2016 combinaisons, ancien `check-selection.ts`)
- [ ] `check-edges.ts` (oracle C4, actuellement `scripts/tmp-edges.ts` non suivi)
- [ ] Étendre la matrice de `check-graph.ts` à `backend.framework`
- [ ] Couvrir le cas « fastapi accepté » (contrepartie de la règle C5b)
- [ ] `spec-edit.ts` n'est pas exporté par `core/index.ts` — décider

## Évolutions identifiées (audit du 2026-09-20)

### Corrigées pendant l'audit
- [x] Resolver : `rust-web-frontend` n'est choisi que pour `framework: askama`
- [x] Preset `react-frontend-only` : `docker: false`
- [x] `MOBILE.md` généré : commandes `dx bundle` documentées

### À traiter
- [ ] Support Docker d'un frontend statique (sans backend, `docker-infra` génère un Dockerfile placeholder)
- [ ] `docker-infra` exige `backend_runtime` mais `react-vite` n'en fournit pas : le lien `react-vite > docker-infra` n'a de sens que dans des états invalides
- [x] Supprimer les ponts inutilisés `src/engine/{bricks,generator,resolver}.ts`
- [ ] Double lockfile `bun.lock` / `package-lock.json` : n'en garder qu'un
- [ ] `rust-web-app` est classée `frontend` dans le registre
- [ ] `BrickRegistry.clone()` : commentaire « deep copy » mais copie superficielle
- [ ] Aucune brique pour le profil `go`, le type `cli` et le framework `vue`
- [ ] Aucun script `test` dans `package.json`
- [ ] `server.ts` : schéma de prompt et repli heuristique dupliquent la connaissance du registre (D6)