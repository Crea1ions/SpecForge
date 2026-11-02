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

## Rust E-commerce
- [x] Cadrage v1, ADR et modèle de domaine
- [x] Migrations PostgreSQL versionnées générées par SpecForge
- [x] Preset, resolver, sélecteur et contrôle de complétude
- [x] Backend Axum/SQLx et frontend React/Vite générés
- [x] `cargo test` / `cargo build` et build frontend du projet généré
- [x] Golden ajouté ; sorties de tous les presets existants inchangées
- [x] Deux générations identiques et sans chemins dupliqués
- [x] Migrations appliquées sur une base PostgreSQL de test vierge
- [x] Parcours catalogue → panier → commande → paiement mock → stock → retour/remboursement
- [x] Vérification runtime Compose : santé API, catalogue seedé et storefront servi

### Rust E-commerce V2 — implémentation livrée
- [x] ADR V2 : pages/menus, métriques, rôles, relances internes et documents PDF opérationnels
- [x] Pages de contenu persistées, publication programmée, menus hiérarchiques et duplication
- [x] Dashboard gestionnaire avec agrégations et montants groupés par devise
- [x] Vues admin clients, commandes impayées et paniers abandonnés
- [x] Relance manuelle idempotente vers la file interne, sans envoi d’e-mail
- [x] PDFs confirmation, livraison et retour/remboursement avec contrôle d’accès propriétaire
- [x] UI générée alignée sur le prototype statique responsive
- [x] Build/test scaffold neuf, golden des autres presets inchangés et déterminisme vérifié
- [ ] Exécution du test d’acceptation complet sur une base PostgreSQL jetable

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

## Bricks UI/UX natives par template (module `core/ui-ux/`)
- [x] Configuration UI/UX autonome (`ProjectUiUxConfig`, fin de l'alias vers `StaticWebConfig`)
- [x] Contrats Definition / Implementation / Integration et registre dédié
- [x] Validateur UI/UX dédié (compatibilités, implémentations manquantes, option `docsSite`)
- [x] Implémentation Askama — `rust-web-app` (accueil natif, pages/routes natives, thème tokens, retrait du montage `ServeFile`/fallback)
- [x] Implémentation Askama — `rust-web-frontend` (documents autonomes, fondation métier préservée)
- [x] Implémentation React — `web-platform`, `frontend-only`, `desktop/Tauri` (App.tsx alimenté, cartes métier préservées)
- [x] Implémentation Dioxus — `mobile` (tiroir piloté par les pages, `dangerous_inner_html`)
- [x] E-commerce — thème seul appliqué à la vitrine (pilotée par les données métier)
- [x] API-only — site documentaire `docs-site/` sur option explicite, désactivé par défaut
- [x] Éditeur partagé alimenté par les bricks compatibles, preview par cible
- [x] Aperçu : pages empilées cliquables, burger responsive, panneau déroulant standard (300px), thèmes Paper/Ocean/Obsidian distincts, palettes dérivées contrastées
- [x] Interrupteur clair/sombre fonctionnel par défaut dans toutes les interfaces générées (sélecteur `displayMode` retiré de l'éditeur applicatif)
- [x] Aucun site HTML parallèle (`ui-site/` supprimé) ; Static Web inchangé
- [x] Vérifications : `npm test`, `npm run lint`, `npm run build`, cargo check des scaffolds Rust, build Vite du scaffold React, smoke test HTTP de `rust-web-app`

## Profils techniques et premiers templates
- [x] TypeScript — Web Frontend React/Vite existant, vérifié et documenté
- [x] Python — API Service FastAPI, REST, OpenAPI, tests ; site documentaire `docs-site/` sur option explicite
- [x] Go — API Service `net/http`, REST, OpenAPI, tests ; site documentaire `docs-site/` sur option explicite
- [ ] Ajouter progressivement d’autres templates compatibles Python et Go
- [x] Afficher explicitement dans le Wizard les types d’application encore indisponibles

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
