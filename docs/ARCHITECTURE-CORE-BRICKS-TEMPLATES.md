# Architecture Core / Bricks / Templates

## 1. Objet

Ce document décrit l'architecture actuelle de SpecForge autour de trois
notions centrales :

-   **Core** : autorité technique qui valide, résout et génère.
-   **Bricks** : briques techniques autonomes qui décrivent les
    capacités et décisions qu'elles introduisent.
-   **Templates** : squelettes applicatifs cohérents, sélectionnés en
    fonction du profil technique et du type d'application.

Le principe général est :

``` text
Preset
  ↓
ProjectSpecification
  ↓
Validator
  ↓
Resolver
  ↓
Bricks / Template autonome
  ↓
Generator
  ↓
Projet généré
```

SpecForge ne cherche pas à construire un produit fini. Il produit une
base de projet cohérente que le développeur pourra ensuite compléter.

------------------------------------------------------------------------

## 2. Principes d'architecture

### 2.1 ProjectSpecification est la source de vérité

La configuration utilisateur est transformée en `ProjectSpecification`.

Elle porte notamment :

-   le projet ;
-   le backend ;
-   le frontend ;
-   la base de données ;
-   l'API ;
-   l'authentification ;
-   l'infrastructure ;
-   les options nécessaires à la génération.

Le Core travaille à partir de cette spécification plutôt que directement
à partir de l'interface utilisateur.

### 2.2 Le Core est l'autorité technique

Le Core est indépendant de React et de l'interface.

Il est responsable de :

1.  valider la spécification ;
2.  résoudre l'architecture ;
3.  déterminer les briques actives ;
4.  collecter les décisions architecturales ;
5.  générer les fichiers.

Le bridge Node/Express peut orchestrer l'application, mais ne doit pas
devenir un second Core.

### 2.3 Déterminisme

À spécification identique, la résolution et la génération doivent
produire un résultat déterministe.

Les décisions techniques doivent être explicables et traçables.

### 2.4 Autonomie des briques

Chaque brique est propriétaire des décisions architecturales qu'elle
introduit.

Une brique peut donc déclarer :

-   ce qu'elle fournit ;
-   ce dont elle dépend ;
-   avec quoi elle est compatible ;
-   avec quoi elle entre en conflit ;
-   les fichiers qu'elle génère ;
-   les conditions sous lesquelles elle produit effectivement ces
    fichiers ;
-   les décisions architecturales qu'elle introduit.

Le Core orchestre ces informations ; il ne doit pas réimplémenter dans
un moteur générique les choix propres à chaque brique.

------------------------------------------------------------------------

## 3. Organisation du Core

La structure actuelle du Core est organisée autour de :

``` text
src/core/
├── types.ts
├── utils.ts
├── registry.ts
├── validator.ts
├── resolver.ts
├── generator.ts
├── index.ts
└── bricks/
    └── default-bricks.ts
```

### `types.ts`

Contient les contrats de données utilisés par le Core, notamment :

-   `ProjectSpecification` ;
-   configuration backend/frontend ;
-   configuration API ;
-   configuration authentification ;
-   configuration infrastructure ;
-   définitions de briques ;
-   fichiers générés ;
-   décisions architecturales ;
-   contexte de génération.

Le contrat doit rester indépendant des détails d'implémentation d'une
brique particulière.

### `registry.ts`

Le registre contient les briques connues du Core.

Il constitue la source de connaissance des briques disponibles pour la
résolution.

Le registre ne doit pas devenir un lieu de logique métier spécifique aux
briques.

### `validator.ts`

Le validator vérifie que la `ProjectSpecification` est supportée et
cohérente.

Il traite notamment les incompatibilités ou fonctionnalités non
disponibles.

Exemple actuel : lorsque l'authentification est activée, le provider
demandé doit correspondre à une authentification actuellement disponible
dans le registre Core.

Le validator intervient avant la résolution afin d'éviter de générer une
architecture connue comme invalide ou non supportée.

### `resolver.ts`

Le resolver transforme la `ProjectSpecification` en architecture
résolue.

Il détermine notamment les briques actives.

Exemple conceptuel :

``` text
backend Rust
+
frontend React
+
REST
+
JWT
+
OpenAPI
+
Docker
+
systemd
        ↓
rust-backend
react-vite
rest-api
jwt-auth
openapi
docker-infra
systemd-infra
```

Le resolver connaît les grandes règles d'activation issues de la
spécification.

Il ne doit pas devenir un second emplacement de génération de fichiers.

### `generator.ts`

Le generator transforme l'architecture résolue en fichiers.

Les briques fournissent leurs fichiers via leur contrat de génération.

Le générateur reste responsable du mécanisme global de production du
projet, tandis que chaque brique reste propriétaire de son contenu
généré.

------------------------------------------------------------------------

## 4. Contrat d'une Brick

Une brique est décrite par une `BrickDefinition`.

Son contrat actuel contient notamment :

``` ts
interface BrickDefinition {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string;
  iconName: string;

  provides: string[];
  requires: string[];
  compatibleWith: string[];
  conflictsWith: string[];

  options: BrickOption[];
  templateFiles: string[];
  tags: string[];

  generateDecisions?: (
    ctx: GenerationContext
  ) => ArchitecturalDecision[];

  generateFiles: (
    ctx: GenerationContext
  ) => GeneratedFile[];
}
```

Les détails exacts du type sont définis dans `src/core/types.ts`.

### 4.1 `id`

Identifiant stable de la brique.

Il est utilisé par le registre et par la résolution.

### 4.2 `provides`

Décrit les capacités apportées par la brique.

Exemples :

``` text
backend_runtime
rest_server
jwt_authentication
openapi_contract
systemd_service
```

### 4.3 `requires`

Décrit les capacités nécessaires à la brique.

Exemples :

``` text
backend_runtime
rest_server
```

La dépendance exprime une nécessité architecturale, pas simplement un
fichier à copier.

### 4.4 `compatibleWith`

Décrit les éléments avec lesquels la brique est prévue pour fonctionner.

Cette propriété participe au modèle de compatibilité du Core.

### 4.5 `conflictsWith`

Décrit les combinaisons explicitement incompatibles.

### 4.6 `templateFiles`

Décrit les fichiers associés à la brique.

La liste constitue une information déclarative sur son périmètre de
génération.

### 4.7 `options`

Expose les options configurables propres à la brique.

Le modèle actuel permet notamment des options de type `select`.

### 4.8 `generateFiles`

Cette fonction produit les fichiers de la brique à partir du
`GenerationContext`.

Une brique peut conditionner sa génération au contexte réel.

Exemple : `jwt-auth` génère actuellement son intégration Rust uniquement
lorsque le backend est Rust.

Cette logique appartient à la brique plutôt qu'à un moteur de
composition générique.

### 4.9 `generateDecisions`

Cette fonction permet à une brique de déclarer les décisions
architecturales qu'elle introduit.

Exemple :

``` ts
generateDecisions: () => [
  {
    id: 'ADR-...',
    title: '...',
    status: 'Accepted',
    context: '...',
    decision: '...',
    consequences: ['...'],
    generatingBrick: '...',
  },
]
```

Le resolver collecte et normalise ces décisions ; il n'en devient pas
propriétaire.

------------------------------------------------------------------------

## 5. Pourquoi il n'existe pas de moteur de composition générique

SpecForge a expérimenté une approche où plusieurs briques contribuaient
à un même fichier ou à une même structure de configuration.

Cette approche a produit des sorties incorrectes, notamment des
structures TOML rendues sous forme de :

``` text
[object Object]
```

L'architecture actuelle privilégie donc des briques autonomes et des
templates cohérents plutôt qu'un système générique de composition de
fragments.

### Règle actuelle

> Une brique génère ce dont elle est propriétaire.

Le Core orchestre :

``` text
validation
→ résolution
→ activation
→ génération
```

mais ne cherche pas à fusionner arbitrairement des fragments produits
par différentes briques.

------------------------------------------------------------------------

## 6. Templates et Bricks : deux niveaux différents

Les **bricks** représentent des capacités techniques réutilisables.

Les **templates** représentent des architectures applicatives
cohérentes.

Ils ne doivent pas être confondus.

### Brick

Une brick répond principalement à :

> Quelle capacité technique cette architecture introduit-elle ?

Exemples :

-   Rust backend ;
-   React/Vite ;
-   PostgreSQL ;
-   REST ;
-   JWT ;
-   OpenAPI ;
-   Docker ;
-   systemd.

### Template

Un template répond à :

> Quel squelette d'application cohérent veut-on générer ?

Exemples actuels côté Rust :

``` text
Rust + Askama + SQLite      → Web App
Rust + React + PostgreSQL   → Web Platform
Rust + Askama (frontend)    → Web Frontend
Rust Backend Only           → API Service
Rust + Tauri + React        → Desktop
Rust + Dioxus               → Mobile
```

Le template sélectionne et structure une architecture de départ.

Il n'est pas nécessairement la simple somme mécanique de briques
indépendantes.

------------------------------------------------------------------------

## 7. Templates autonomes

Le cas le plus important est celui des templates applicatifs complets.

### `rust-web-app`

`rust-web-app` est un template full-stack autonome.

Il constitue un squelette cohérent de web application Rust avec
frontend.

Le resolver lui réserve un traitement particulier.

Notamment :

``` text
rust-web-app
    ↓
pas de sqlite-storage séparé
```

La persistance SQLite/SQLx fait partie du squelette `rust-web-app`.

Cette règle évite de traiter le template comme une simple combinaison
mécanique de briques génériques.

### Conséquence

Lorsqu'un template autonome existe pour un cas d'usage, le resolver peut
l'activer directement plutôt que reconstruire le projet à partir de
briques génériques.

### Résolution actuelle par template

Le resolver choisit d'abord le squelette du template (étape 1 de `resolveArchitecture`), puis ajoute les capacités optionnelles (REST, OpenAPI, JWT, Docker, systemd, qualité, documentation) d'après la spécification.

| Template | Preset | Briques du squelette | Voie dans le resolver |
| --- | --- | --- | --- |
| `web-app` | `rust-web-app` | `rust-web-app` | branche dédiée |
| `web-frontend` (Askama) | `rust-web-frontend` | `rust-web-frontend` | branche dédiée |
| `mobile` | `rust-dioxus-mobile` | `rust-dioxus-mobile` | branche dédiée |
| `web-platform` | `rust-react-postgres` | `rust-backend`, `react-vite`, `postgres-storage` | branche générique |
| `desktop` | `rust-tauri-react` | `react-vite`, `tauri-desktop`, `sqlite-storage` | branche générique |
| `api-service` | `rust-backend-only` | `rust-backend`, `sqlite-storage` | branche générique |
| `web-frontend` (React) | `react-frontend-only` | `react-vite` | branche générique |
| `api-service` (Python) | `python-api-service` | `python-backend`, `rest-api`, `openapi`, `quality-suite` | branche générique |
| `api-service` (Go) | `go-api-service` | `go-backend`, `rest-api`, `openapi`, `quality-suite` | branche générique |

Les profils techniques proposent 10 presets pour 7 types de template : `web-frontend` a les variantes Rust/Askama et TypeScript/React; `api-service` a les variantes Rust, Python/FastAPI et Go/`net/http`. Static Web ajoute ses trois templates autonomes.

Points à connaître :

- La brique `rust-web-frontend` n'est choisie que si `frontend.framework` vaut `askama`. Avec `react`, la branche générique active `react-vite`.
- `docker-infra` génère actuellement une image exécutable pour les runtimes Rust pris en charge; les presets Python et Go gardent `docker: false` et le validateur refuse cette capacité jusqu’à ce qu’un Dockerfile adapté soit généré.
- Le preset `rust-tauri-react` n'active pas `rust-backend` : `tauri-desktop` fournit `backend_runtime`.

------------------------------------------------------------------------

## 8. Exemple de résolution

Pour une spécification demandant une application avec :

``` text
Backend        = Rust
Frontend       = React
API            = REST
OpenAPI        = activé
Authentication = JWT
Docker         = activé
Systemd        = activé
```

le resolver peut produire une architecture comprenant :

``` text
rust-backend
react-vite
rest-api
openapi
jwt-auth
docker-infra
systemd-infra
```

Chaque brique reste ensuite responsable de son propre périmètre.

Par exemple :

``` text
jwt-auth
    → src/auth.rs

openapi
    → openapi.yaml

systemd-infra
    → deploy/systemd/app.service
```

Le `rust-backend` reste propriétaire de son squelette backend.

------------------------------------------------------------------------

## 9. Conditions de génération

L'activation d'une brique et la génération effective de ses fichiers
sont deux choses liées mais distinctes.

Une brique peut être active dans une architecture et ne produire
certains fichiers que lorsque le contexte le justifie.

Exemple actuel pour OpenAPI :

``` ts
if (ctx.activeBricks.some((brick) => brick.id === 'rest-api')) {
  // génération du contrat OpenAPI
}
```

Cette règle évite qu'OpenAPI invente un contrat d'API lorsqu'aucune
brique REST active ne fournit réellement l'API correspondante.

Même principe pour certaines briques d'infrastructure :

``` text
brique activée
    ↓
contexte compatible ?
    ↓ oui
génération
```

------------------------------------------------------------------------

## 10. Architectural Decisions

Les décisions architecturales sont attachées aux briques qui les
introduisent.

Le flux est :

``` text
Brick
  ↓
generateDecisions(ctx)
  ↓
ArchitecturalDecision[]
  ↓
Resolver / Core
  ↓
architecture expliquée
```

Le champ :

``` ts
generatingBrick: string
```

permet de conserver l'origine de la décision.

L'objectif est d'éviter une documentation architecturale centralisée qui
deviendrait rapidement déconnectée des composants réels.

------------------------------------------------------------------------

## 11. Exemple des briques actuellement intégrées

Le registre actuel comprend 18 briques de base, complétées par les briques e-commerce :

  Brique                Domaine            Rôle
  --------------------- ------------------ --------------------------------------
  `rust-backend`        backend            Runtime/backend Rust
  `python-backend`      backend            Runtime Python/FastAPI
  `go-backend`          backend            Runtime Go/net/http
  `react-vite`          frontend           React + Vite + TypeScript + Tailwind
  `tauri-desktop`       frontend/desktop   Interface desktop Tauri
  `sqlite-storage`      data               Persistance SQLite
  `postgres-storage`    data               Persistance PostgreSQL
  `rest-api`            API                Serveur/API REST
  `docker-infra`        infrastructure     Conteneurisation
  `quality-suite`       quality            Tests/lint/qualité
  `docs-pack`           documentation      Documentation générée
  `work-structure`      workflow           Structure de travail
  `rust-web-frontend`   template           Squelette web frontend Rust
  `rust-web-app`        template           Squelette web application Rust
  `rust-dioxus-mobile`  template           Squelette application mobile Rust (Dioxus)
  `jwt-auth`            authentication     Point d'intégration JWT
  `openapi`             API                Contrat OpenAPI
  `systemd-infra`       infrastructure     Service systemd

La liste exacte et les métadonnées des briques restent définies dans le
registre et `src/core/bricks/default-bricks.ts`.

------------------------------------------------------------------------

## 12. Limites actuelles à préserver

L'architecture actuelle implique volontairement plusieurs limites.

### Pas de composition universelle

Il n'existe pas de moteur chargé de fusionner automatiquement toutes les
contributions de toutes les briques.

### Pas de logique technique dans l'UI

L'interface propose une intention et manipule la spécification.

Elle ne doit pas décider comment construire techniquement le projet.

### Pas de second Core dans le bridge

Le bridge Node/Express orchestre l'application et les flux externes.

Il ne doit pas reproduire le validator, le resolver ou le generator.

### Pas de produit fini

Les fichiers générés constituent un squelette exploitable.

Ils ne cherchent pas à couvrir automatiquement toutes les
fonctionnalités métier d'un produit réel.

------------------------------------------------------------------------

## 13. Flux de référence

Le flux conceptuel de référence est :

``` text
┌──────────────────────┐
│       Preset         │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ ProjectSpecification │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│      Validator       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       Resolver       │
│                      │
│ active bricks        │
│ template rules       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│  Brick / Template    │
│                      │
│ generateFiles()      │
│ generateDecisions()  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│      Generator       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│  Projet généré       │
└──────────────────────┘
```

La séparation essentielle est :

``` text
Specification
    ≠
Architecture résolue
    ≠
Fichiers générés
```

La première exprime l'intention structurée.

La deuxième décrit ce que SpecForge a décidé techniquement.

La troisième est le résultat concret de la génération.

------------------------------------------------------------------------

## 14. Règles pratiques pour faire évoluer le Core

Lorsqu'une nouvelle capacité est ajoutée :

1.  déterminer si elle constitue une nouvelle brick ou une extension
    d'une brick existante ;
2.  définir son contrat (`provides`, `requires`, compatibilités,
    conflits) ;
3.  déterminer qui est propriétaire des décisions architecturales
    introduites ;
4.  ajouter `generateDecisions` si nécessaire ;
5.  définir précisément les fichiers dont la brique est propriétaire ;
6.  ajouter les conditions de génération nécessaires ;
7.  connecter l'activation au resolver lorsque la spécification le
    justifie ;
8.  valider la résolution ;
9.  générer un projet réel ;
10. compiler/tester le projet généré.

Lorsqu'un nouveau template applicatif est créé :

1.  déterminer le cas d'usage qu'il représente ;
2.  conserver un squelette cohérent et autonome ;
3.  décider explicitement quelles briques génériques il remplace ou
    englobe ;
4.  ajouter les règles particulières du resolver uniquement lorsqu'elles
    sont nécessaires ;
5.  vérifier le projet généré comme un projet réel.

------------------------------------------------------------------------

## 15. Principe directeur

L'architecture peut être résumée par :

> **Le Core décide de l'architecture, les briques possèdent les
> décisions qu'elles introduisent, les templates possèdent les
> squelettes applicatifs cohérents, et le Generator produit le projet.**

Ou, plus simplement :

``` text
Core       → décide et orchestre
Brick      → possède une capacité technique
Template   → possède une architecture applicative cohérente
Generator  → matérialise le résultat
Developer  → construit le produit
```

---

## 16. Profil Static Web et bricks de composition

Le profil `static-web` ajoute une configuration de contenu et de présentation `staticWeb` à la
`ProjectSpecification`. Le Core conserve le pipeline existant :

```text
ProjectSpecification.staticWeb
        ↓
validateStaticWebConfig
        ↓
Static Web renderer
        ↓
GeneratedFile[]
```

Le modèle comprend séparément le mode de composition
(`content-driven` / `layout-driven`), l'organisation des pages
(`single-page` / `multi-page` / `documentation`) et le mode de navigation.
La configuration propose un menu latéral repliable ou un menu burger
déroulant ; les anciennes valeurs `topbar` et `combined` restent interprétées
pour préserver les projets existants. Les templates `static-documentation`,
`static-website` et `static-landing-page` sont des points de départ, pas des
catégories fermées.

Les contrats de composition sont déclarés dans
`src/core/static-web/bricks.ts` et exposés par `StaticWebBrickRegistry`.
Chaque `StaticWebBrickDefinition` décrit son identité, sa catégorie, ses
propriétés, ses valeurs par défaut et ses profils/templates compatibles. Les
six bricks initiales sont Hero, Text / Content, Features / Cards, Gallery,
Testimonials et Call To Action. L'interface édite les propriétés déclarées ;
le moteur dans `render.ts` possède les implémentations de rendu. Cette
séparation est additive : elle ne transforme pas les `BrickDefinition`
existantes et ne suppose pas que leur code de génération soit partagé avec un
autre profil.

`content.ts` lit le frontmatter YAML et produit les pages normalisées. La
validation du Core vérifie les slugs, les propriétés de bricks, les couleurs,
les URL, les chemins et les ressources locales. Le moteur Markdown échappe les
fragments HTML et n'émet pas les liens utilisant des protocoles non autorisés.
Les prévisualisations et la génération utilisent les mêmes fonctions de
rendu.

Single HTML intègre CSS, JavaScript, contenu et assets en base64. L'export
multi-fichiers n'utilise que des références relatives locales et comprend son
CSS, son JavaScript et ses assets. La recherche est générée à partir d'un index
local intégré au HTML ; aucun chargement réseau, import dynamique, CDN ou
backend n'est requis pour ouvrir le résultat via `file://`.

## 17. Bricks UI/UX natives par template (module `core/ui-ux/`)

Les modèles applicatifs hors Static Web portent une configuration `uiUx` dans
`ProjectSpecification`. Cette configuration alimente **l'interface native du
template** — templates Askama, composants React, RSX Dioxus — sans produire de
site HTML parallèle. Le système Static Web (`core/static-web/`) reste un
système séparé et autonome : registre, renderer, pipeline et tests inchangés.

### 17.1 Responsabilités séparées

1. **Configuration commune** — `ProjectUiUxConfig` (type autonome, distinct de
   `StaticWebConfig`) : pages et contenu Markdown, blocs composés, navigation,
   thème/tokens, assets importés, et l'option `docsSite` réservée aux templates
   API-only (désactivée par défaut).
2. **Définition de brick** — `ProjectUiUxBrickDefinition` (`ui-ux/bricks.ts`) :
   contrat sémantique (identifiant, catégorie, propriétés, valeurs par défaut,
   compatibilités profil/template), sans génération liée à un langage. Socle :
   `hero`, `text-content`, `features`, `gallery`, `testimonials`,
   `call-to-action`.
3. **Implémentation de brick** — `ProjectUiUxBrickImplementation`
   (`ui-ux/implementations/`) : rendu natif par cible (`askama`, `react`,
   `dioxus`) et rendu d'aperçu HTML pour l'éditeur. Une même définition a
   plusieurs implémentations ; le renderer de blocs HTML partagé
   (`implementations/html-blocks.ts`) porte le langage visuel commun.
4. **Intégration de template** — `UI_UX_TEMPLATE_INTEGRATIONS`
   (`ui-ux/registry.ts`) : cible de rendu résolue par couple profil/template,
   présence d'interface native, et `supportsContentPages: false` pour les
   interfaces pilotées par les données métier (e-commerce : seul le thème est
   appliqué à la vitrine).
5. **Core** — `validator.ts` délègue à `validateProjectUiUxConfig` pour les
   profils non Static Web (configuration, compatibilités, implémentations
   manquantes, option `docsSite`). `generator.ts` n'appelle plus le renderer
   Static Web pour `uiUx` : les implémentations natives sont consommées par les
   générateurs des templates. Seule exception : un template API-only avec
   `docsSite: true` produit `docs-site/` via le renderer Static Web.
6. **Preview** — `renderProjectUiUxPreview` (`ui-ux/preview.ts`) délègue au
   renderer de la cible résolue : l'aperçu correspond au moteur qui produira
   l'application.

### 17.2 Intégrations natives actuelles

| Template | Cible | Intégration |
|---|---|---|
| `rust-web-app` | Askama | Pages dans `templates/index.html` + `templates/pages/<slug>.html`, routes/handlers dédiés, thème dans `static/css/tokens.css`, blocs dans `static/css/style.css`, assets sous `static/assets/`. Routes `/dashboard` et API préservées. |
| `rust-web-frontend` | Askama | Mêmes sorties ; documents autonomes (le layout n'est pas héritable), template de fondation préservé dans `templates/foundation.html` pour les routes métier. |
| `rust-react-postgres`, `react-frontend-only`, `rust-tauri-react` | React | `frontend/src/App.tsx` alimenté (navigation par état, pages en composants, Markdown via `dangerouslySetInnerHTML`), thème et styles des blocs dans `frontend/src/index.css`, assets sous `frontend/public/assets/`. Cartes d'état métier préservées sur l'accueil. |
| `rust-dioxus-mobile` | Dioxus | `src/main.rs` alimenté (tiroir piloté par les pages, contenu via `dangerous_inner_html`), thème dans `assets/main.css`. Carte compteur métier préservée. Limite connue : les images importées ne sont pas embarquées dans le bundle mobile (pas de dossier public servi) ; la brick `gallery` y est à réserver aux contenus sans assets locaux. |
| `rust-ecommerce` | React (thème seul) | Vitrine pilotée par les données métier : surcharge des tokens de `frontend/src/index.css` uniquement ; la composition par blocs n'y est pas proposée. |
| `rust-backend-only`, `python-api-service`, `go-api-service` | API-only | Pas d'interface native ; site documentaire `docs-site/` uniquement si `docsSite` est explicitement activé (désactivé par défaut, combinaison refusée par le validateur sur les templates à interface). |

### 17.3 Éditeur partagé et aperçu

L'éditeur (`StaticWebEditor.tsx`) conserve le parcours en cinq étapes, l'import
de fichiers ou de dossiers `.md`, l'organisation des pages, les blocs et leurs
propriétés, les thèmes, la navigation et l'aperçu responsive. Hors Static Web,
il est alimenté par les bricks réellement compatibles avec le template
(`getProjectUiUxBricksForSpec`), l'aperçu utilise l'implémentation de la cible,
et les templates API-only exposent la case « Générer le site documentaire
(docs-site/) », décochée par défaut.

Comportements de l'aperçu, alignés sur les applications générées :

- **Pages cliquables** : toutes les pages sont empilées dans l'aperçu et la
  navigation mène aux ancres correspondantes (y compris les liens inter-pages
  du contenu Markdown importé).
- **Navigation** : le mode latéral bascule en menu burger au format mobile ;
  le mode burger s'applique à toutes les tailles d'écran. Le panneau
  déroulant est standard et identique sur toutes les cibles (300px, max 85vw).
- **Thèmes** : les presets Paper, Ocean et Obsidian sont trois palettes
  distinctes et identifiables ; les couleurs personnalisées dérivent une
  palette complète (`core/ui-ux/theme.ts`) — surfaces, bordures et texte
  atténué calculés depuis le fond et le texte — garantissant le contraste en
  thème clair comme en thème sombre, dans l'aperçu et dans les applications
  générées.
- **Interrupteur clair/sombre par défaut** : toutes les interfaces générées
  embarquent un interrupteur de thème fonctionnel (en-tête Askama, sidebar et
  topbar React, topbar Dioxus), avec persistance locale et préférence système
  au premier lancement. Les deux palettes (claire et sombre) sont émises dans
  les tokens natifs. Le champ hérité `displayMode` reste dans la spec pour
  compatibilité mais n'est plus proposé ni appliqué pour les templates
  applicatifs (il reste actif pour Static Web et le site documentaire).

### 17.4 Ajouter une brick UI/UX ou une cible

1. Déclarer la `ProjectUiUxBrickDefinition` dans `ui-ux/bricks.ts` (contrat,
   propriétés, compatibilités).
2. Fournir une implémentation par cible visée dans
   `ui-ux/implementations/<cible>.ts` et l'enregistrer dans
   `ui-ux/implementations/index.ts` ; une brick utilisée sans implémentation
   pour la cible résolue produit un diagnostic de validation bloquant.
3. Pour un nouveau template : déclarer son `ProjectUiUxTemplateIntegration`
   dans `ui-ux/registry.ts` et brancher sa cible dans son générateur natif.

### 17.5 Tests

`npm test` couvre la validation (option `docsSite`, implémentations
manquantes), la génération native déterministe sans site parallèle, l'import
Markdown en routes natives, les previews par cible, la non-régression métier et
l'intégralité du pipeline Static Web. Les scaffolds générés sont vérifiés par
`cargo check` (templates Rust) et par la compilation du frontend React.
