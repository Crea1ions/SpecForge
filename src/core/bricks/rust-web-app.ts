import { BrickDefinition, GenerationContext, GeneratedFile, ArchitecturalDecision } from '../types';
import { makeFile, makeBinaryFile } from './helpers';
import { FAVICON_BASE64 } from '../assets/favicon';

// 16. Rust Web App Brick
export const rustWebAppBrick: BrickDefinition = {
  id: 'rust-web-app',
  name: 'Rust Web App',
  category: 'frontend',
  version: '1.0.0',
  description:
    'Application web complète en Rust avec Axum, Askama, SQLite et SQLx. Squelette autonome UI, serveur et persistance locale.',
  iconName: 'Globe',
  provides: [
    'backend_runtime',
    'web_application',
    'server_rendered_ui',
    'html_templates',
    'web_server',
    'sqlite_persistence',
    'database_migrations',
    'responsive_ui',
    'design_system',
  ],
  requires: [],
  compatibleWith: [
    'rest-api',
    'docker-infra',
    'quality-suite',
    'docs-pack',
    'work-structure',
  ],
  conflictsWith: [
    'react-vite',
    'tauri-desktop',
    'rust-web-frontend',
    'postgres-storage',
  ],
  options: [],
  templateFiles: [
    'Cargo.toml',
    'src/main.rs',
    'src/config.rs',
    'src/db.rs',
    'src/routes.rs',
    'src/handlers.rs',
    'src/models.rs',
    'migrations/0001_initial.sql',
    'templates/layout.html',
    'templates/index.html',
    'templates/dashboard.html',
    'templates/components/header.html',
    'templates/components/navigation.html',
    'templates/components/footer.html',
    'static/css/tokens.css',
    'static/css/style.css',
    'static/favicon.png',
    'static/js/app.js',
  ],
  tags: [
    'rust',
    'axum',
    'tokio',
    'askama',
    'server-rendered',
    'sqlite',
    'sqlx',
    'migrations',
    'responsive',
    'design-system',
    'html',
    'css',
    'vanilla-js',
  ],
  generateDecisions: (ctx: GenerationContext): ArchitecturalDecision[] => [
      {
        id: 'ADR-001',
        title: `Serveur web Rust avec ${ctx.spec.backend.framework}`,
        status: 'Accepted',
        context:
          'L’application nécessite un serveur web autonome capable de porter la logique métier, le routage HTTP et le rendu des pages.',
        decision:
          `Adoption de Rust avec ${ctx.spec.backend.framework} et Tokio comme socle serveur de l’application web.`,
        consequences: [
          'Le backend et le serveur HTTP sont regroupés dans une application Rust autonome.',
          'Le typage statique et le modèle d’exécution de Rust structurent la logique serveur.',
          `Le serveur écoute sur le port configuré ${ctx.spec.backend.port}.`,
        ],
        generatingBrick: 'rust-web-app',
      },
      {
        id: 'ADR-002',
        title: 'Interface web server-rendered avec Askama',
        status: 'Accepted',
        context:
          'L’application nécessite une interface web intégrée au serveur sans dépendre d’un framework frontend JavaScript ou d’un bundler.',
        decision:
          'Adoption d’Askama pour le rendu HTML côté serveur, avec HTML, CSS et JavaScript vanilla pour la couche interface.',
        consequences: [
          'Les templates HTML sont générés directement par l’application Rust.',
          'Aucune dépendance à React, Vue, Angular, Vite ou Webpack n’est requise.',
          'La structure UI reste légère, lisible et directement exploitable dans le projet généré.',
        ],
        generatingBrick: 'rust-web-app',
      },
      {
        id: 'ADR-003',
        title: 'Persistance locale avec SQLite et SQLx',
        status: 'Accepted',
        context:
          'L’application complète nécessite une persistance locale simple, intégrée au projet et adaptée à un déploiement autonome.',
        decision:
          'Adoption de SQLite avec SQLx et une structure de migrations versionnées comme couche de persistance par défaut.',
        consequences: [
          'La base de données est locale au projet généré.',
          'Les migrations SQL permettent de faire évoluer explicitement le schéma.',
          'Aucun serveur PostgreSQL distant n’est requis pour le socle de l’application.',
        ],
        generatingBrick: 'rust-web-app',
      },
    ],
  generateFiles: (ctx: GenerationContext): GeneratedFile[] => {
    const files: GeneratedFile[] = [];
    const brickId = 'rust-web-app';
    const brickName = 'Rust Web App';
    const brickVersion = '1.0.0';
    const hasRestApi = ctx.activeBricks.some((brick) => brick.id === 'rest-api');

    files.push(
      makeFile(
        'Cargo.toml',
        `[package]
name = "${ctx.spec.project.slug}"
version = "${ctx.spec.project.version}"
edition = "2021"

[dependencies]
axum = "0.7"
askama = "0.12"
tokio = { version = "1.38", features = ["full"] }
tower-http = { version = "0.5", features = ["fs", "trace"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "sqlite", "macros", "migrate"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "fmt"] }
dotenvy = "0.15"
`,
        'toml',
        brickId,
        brickName,
        brickVersion,
        'Socle Rust autonome pour application web complète avec Axum, Askama et SQLite.'
      )
    );

    files.push(
      makeFile(
        'src/main.rs',
        `mod config;
${hasRestApi ? 'mod api;\n' : ''}mod db;
mod handlers;
mod models;
mod routes;

use std::net::SocketAddr;

use axum::Router;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing::info;

use config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "info".to_string()),
        )
        .init();

    std::fs::create_dir_all("data")
        .expect("Failed to create data directory");

    let config = Config::from_env()?;
    let db = db::connect(&config.database_url).await?;

    sqlx::migrate!("./migrations")
        .run(&db)
        .await?;

    let app = Router::new()
        .merge(routes::router())
        .nest_service("/static", ServeDir::new("static"))
        .layer(TraceLayer::new_for_http())
        .with_state(db);

    let address = SocketAddr::from(([0, 0, 0, 0], config.port));

    info!("Rust Web App listening on {}", address);

    let listener = tokio::net::TcpListener::bind(address).await?;

    axum::serve(listener, app).await?;

    Ok(())
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Point d’entrée autonome du serveur Axum, initialisation de la configuration, de SQLite et des migrations.'
      )
    );

    files.push(
      makeFile(
        'src/config.rs',
        `use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()?;

        let database_url =
            env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite://data/app.db?mode=rwc".to_string());

        Ok(Self {
            port,
            database_url,
        })
    }
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Configuration minimale du serveur et de la connexion SQLite via variables d’environnement.'
      )
    );

    files.push(
      makeFile(
        'src/db.rs',
        `use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

pub async fn connect(
    database_url: &str,
) -> Result<SqlitePool, sqlx::Error> {
    SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Création du pool SQLx SQLite utilisé par l’application.'
      )
    );

    files.push(
      makeFile(
        'src/routes.rs',
        `use axum::{
    routing::get,
    Router,
};
use sqlx::SqlitePool;

use crate::handlers;
${hasRestApi ? 'use crate::api;\n' : ''}

pub fn router() -> Router<SqlitePool> {
    let router = Router::new()
        .route("/", get(handlers::index))
        .route("/dashboard", get(handlers::dashboard));

    ${hasRestApi ? 'router.merge(api::router())' : 'router'}
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Déclaration centralisée des routes HTML de l’application.'
      )
    );

    files.push(
      makeFile(
        'src/handlers.rs',
        `use axum::{
    extract::State,
    response::Html,
};
use askama::Template;
use sqlx::SqlitePool;

use crate::models::AppInfo;

#[derive(Template)]
#[template(path = "index.html")]
struct IndexTemplate<'a> {
    app_name: &'a str,
}

#[derive(Template)]
#[template(path = "dashboard.html")]
struct DashboardTemplate {
    app: AppInfo,
}

pub async fn index() -> Html<String> {
    let template = IndexTemplate {
        app_name: "Rust Web App",
    };

    Html(
        template
            .render()
            .unwrap_or_else(|_| "Template rendering error".to_string()),
    )
}

pub async fn dashboard(
    State(_db): State<SqlitePool>,
) -> Html<String> {
    let template = DashboardTemplate {
        app: AppInfo {
            name: "Rust Web App".to_string(),
            version: "0.1.0".to_string(),
        },
    };

    Html(
        template
            .render()
            .unwrap_or_else(|_| "Template rendering error".to_string()),
    )
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Handlers HTML séparés de la définition des routes et du modèle de données.'
      )
    );

    files.push(
      makeFile(
        'src/models.rs',
        `#[derive(Debug, Clone)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Modèle métier minimal servant de base aux futures fonctionnalités de l’application.'
      )
    );

    files.push(
      makeFile(
        'migrations/0001_initial.sql',
        `CREATE TABLE IF NOT EXISTS app_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
       );

        INSERT INTO app_metadata (name, version)
        SELECT 'Rust Web App', '0.1.0'
        WHERE NOT EXISTS (
            SELECT 1 FROM app_metadata
       );

       CREATE TABLE IF NOT EXISTS items (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           title TEXT NOT NULL,
           completed BOOLEAN NOT NULL DEFAULT 0,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
       `,
        'sql',
        brickId,
        brickName,
        brickVersion,
        'Migration SQLite initiale servant de point de départ à la persistance métier.'
      )
    );

    files.push(
      makeFile(
        'templates/layout.html',
        `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <meta
        name="description"
        content="Application web Rust server-rendered."
    >
    <title>{% block title %}Rust Web App{% endblock %}</title>
    <link rel="icon" type="image/png" href="/static/favicon.png">
    <link rel="stylesheet" href="/static/css/tokens.css">
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <div class="app-shell">
        {% include "components/header.html" %}

        <div class="app-body">
            {% include "components/navigation.html" %}

            <main class="main-content">
                {% block content %}{% endblock %}
            </main>
        </div>

        {% include "components/footer.html" %}
    </div>

    <script src="/static/js/app.js" defer></script>
</body>
</html>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Layout Askama partagé par les pages de l’application.'
      )
    );

    files.push(
      makeFile(
        'templates/index.html',
        `{% extends "layout.html" %}

{% block title %}{{ app_name }}{% endblock %}

{% block content %}
<section class="hero">
    <div class="eyebrow">Rust · Axum · Askama · SQLite</div>

    <h1>Une base web complète, simple et exploitable.</h1>

    <p class="hero-copy">
        Un socle server-rendered en Rust avec persistance SQLite,
        templates Askama et une interface légère sans framework frontend.
    </p>

    <div class="hero-actions">
        <a class="button button-primary" href="/dashboard">
            Ouvrir le tableau de bord
        </a>
    </div>
</section>
{% endblock %}
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Page d’accueil server-rendered du template.'
      )
    );

    files.push(
      makeFile(
        'templates/dashboard.html',
        `{% extends "layout.html" %}

{% block title %}Tableau de bord{% endblock %}

{% block content %}
<section class="page-header">
    <div>
        <div class="eyebrow">Application</div>
        <h1>Tableau de bord</h1>
        <p>
            Le socle applicatif est opérationnel.
        </p>
    </div>
</section>

<section class="card-grid">
    <article class="card">
        <div class="card-label">Application</div>
        <h2>{{ app.name }}</h2>
        <p>Version {{ app.version }}</p>
    </article>

    <article class="card">
        <div class="card-label">Persistance</div>
        <h2>SQLite</h2>
        <p>Connexion SQLx et migrations activées.</p>
    </article>

    <article class="card">
        <div class="card-label">Rendu</div>
        <h2>Askama</h2>
        <p>Templates HTML server-rendered.</p>
    </article>
</section>
{% endblock %}
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Tableau de bord initial permettant de vérifier le fonctionnement du socle applicatif.'
      )
    );

    files.push(
      makeFile(
        'templates/components/header.html',
        `<header class="topbar">
    <a class="brand" href="/">
        <span class="brand-mark">SF</span>
        <span>Rust Web App</span>
    </a>

    <button
        class="menu-button"
        type="button"
        data-menu-toggle
        aria-expanded="false"
        aria-controls="main-navigation"
    >
        Menu
    </button>
</header>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'En-tête commun avec accès au menu principal.'
      )
    );

    files.push(
      makeFile(
        'templates/components/navigation.html',
        `<nav
    id="main-navigation"
    class="navigation"
    data-navigation
    aria-label="Navigation principale"
>
    <a href="/">Accueil</a>
    <a href="/dashboard">Tableau de bord</a>
</nav>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Navigation principale légère et responsive.'
      )
    );

    files.push(
      makeFile(
        'templates/components/footer.html',
        `<footer class="footer">
    <span>Rust Web App</span>
    <span>Generated by SpecForge</span>
</footer>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Pied de page commun du template.'
      )
    );

    files.push(
      makeFile(
        'static/css/tokens.css',
        `:root {
    --color-background: #f5f3f0;
    --color-surface: #ffffff;
    --color-surface-muted: #ebe7e2;
    --color-border: #ded8d1;

    --color-text: #292522;
    --color-text-muted: #716b65;

    --color-accent: #8b4513;
    --color-accent-hover: #73380f;

    --shadow-sm: 0 1px 3px rgba(41, 37, 34, 0.08);
    --shadow-md: 0 8px 24px rgba(41, 37, 34, 0.08);

    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;

    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --space-8: 3rem;

    --content-width: 1200px;
}
`,
        'css',
        brickId,
        brickName,
        brickVersion,
        'Tokens du design system léger et responsive.'
      )
    );

    files.push(
      makeBinaryFile(
        'static/favicon.png',
        FAVICON_BASE64,
        brickId,
        brickName,
        brickVersion,
        'Favicon PNG 64x64 par défaut, servi sous /static/.'
      )
    );

    files.push(
      makeFile(
        'static/css/style.css',
        `* {
    box-sizing: border-box;
}

html {
    min-height: 100%;
}

body {
    margin: 0;
    min-height: 100vh;
    background: var(--color-background);
    color: var(--color-text);
    font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    line-height: 1.6;
}

a {
    color: inherit;
    text-decoration: none;
}

.app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.topbar {
    width: 100%;
    min-height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-6);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
}

.brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    font-weight: 700;
}

.brand-mark {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: 10px;
    background: var(--color-accent);
    color: white;
    font-size: 0.8rem;
}

.menu-button {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    padding: 0.55rem 0.9rem;
    cursor: pointer;
}

.app-body {
    width: 100%;
    max-width: var(--content-width);
    margin: 0 auto;
    padding: var(--space-6);
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: var(--space-8);
    flex: 1;
}

.navigation {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.navigation a {
    padding: 0.65rem 0.8rem;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
}

.navigation a:hover {
    background: var(--color-surface);
    color: var(--color-text);
}

.main-content {
    min-width: 0;
}

.hero {
    padding: clamp(2rem, 6vw, 5rem) 0;
}

.eyebrow {
    margin-bottom: var(--space-3);
    color: var(--color-accent);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.hero h1,
.page-header h1 {
    max-width: 780px;
    margin: 0;
    font-size: clamp(2rem, 5vw, 4rem);
    line-height: 1.08;
    letter-spacing: -0.03em;
}

.hero-copy {
    max-width: 680px;
    margin: var(--space-5) 0 0;
    color: var(--color-text-muted);
    font-size: 1.1rem;
}

.hero-actions {
    margin-top: var(--space-6);
}

.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.7rem 1rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
}

.button-primary {
    background: var(--color-accent);
    color: white;
}

.button-primary:hover {
    background: var(--color-accent-hover);
}

.page-header {
    margin-bottom: var(--space-6);
}

.page-header h1 {
    font-size: clamp(2rem, 4vw, 3rem);
}

.page-header p {
    color: var(--color-text-muted);
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4);
}

.card {
    padding: var(--space-5);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
}

.card-label {
    margin-bottom: var(--space-2);
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.card h2 {
    margin: 0;
    font-size: 1.2rem;
}

.card p {
    margin-bottom: 0;
    color: var(--color-text-muted);
}

.footer {
    width: 100%;
    max-width: var(--content-width);
    margin: 0 auto;
    padding: var(--space-5) var(--space-6);
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    color: var(--color-text-muted);
    font-size: 0.85rem;
    border-top: 1px solid var(--color-border);
}

@media (max-width: 760px) {
    .topbar {
        padding: 0 var(--space-4);
    }

    .app-body {
        display: block;
        padding: var(--space-4);
    }

    .navigation {
        display: none;
        margin-bottom: var(--space-5);
        padding: var(--space-3);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
    }

    .navigation.open {
        display: flex;
    }

    .card-grid {
        grid-template-columns: 1fr;
    }

    .footer {
        padding: var(--space-4);
        flex-direction: column;
    }
}
`,
        'css',
        brickId,
        brickName,
        brickVersion,
        'Design system et structure responsive desktop/mobile du template.'
      )
    );

    files.push(
      makeFile(
        'static/js/app.js',
        `(() => {
    const menuButton = document.querySelector('[data-menu-toggle]');
    const navigation = document.querySelector('[data-navigation]');

    if (!menuButton || !navigation) {
        return;
    }

    menuButton.addEventListener('click', () => {
        const expanded =
            menuButton.getAttribute('aria-expanded') === 'true';

        menuButton.setAttribute(
            'aria-expanded',
            String(!expanded)
        );

        navigation.classList.toggle('open', !expanded);
    });
})();
`,
        'javascript',
        brickId,
        brickName,
        brickVersion,
        'Interaction JavaScript minimale pour la navigation responsive.'
      )
    );

    return files;
  },
};
