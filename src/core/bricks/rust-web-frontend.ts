import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile, makeBinaryFile } from './helpers';
import { FAVICON_BASE64 } from '../assets/favicon';

// 15. Project RUST Web Frontend Brick
export const rustWebFrontendBrick: BrickDefinition = {
  id: 'rust-web-frontend',
  name: 'Rust Web Frontend',
  category: 'frontend',
  version: '1.1.0',
  description:
    'Frontend web server-rendered en Rust avec Axum, Askama, JavaScript vanilla et CSS.',
  iconName: 'Layout',
  provides: [
    'server_rendered_ui',
    'html_templates',
    'web_frontend',
    'responsive_ui',
    'design_system',
  ],
  requires: [],
  applies: [{ profile: 'rust', template: 'web-frontend', frontend: { framework: 'askama' } }],
  subsumes: ['backend', 'frontend', 'database'],
  compatibleWith: [],
  conflictsWith: ['react-vite', 'tauri-desktop'],
  options: [],
  templateFiles: [
    'Cargo.toml',
    'src/main.rs',
    'src/config.rs',
    'templates/layout.html',
    'templates/index.html',
    'templates/dashboard.html',
    'templates/workspace.html',
    'templates/profile.html',
    'templates/settings.html',
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
    'askama',
    'server-rendered',
    'responsive',
    'design-system',
    'html',
    'css',
    'vanilla-js',
  ],

generateFiles: (ctx) => {
  const files: GeneratedFile[] = [];

  const brickId = 'rust-web-frontend';
  const brickName = 'Rust Web Frontend';
  const brickVersion = '1.1.0';

  files.push(
    makeFile(
        'Cargo.toml',
        `[package]
name = "${ctx.spec.project.slug}"
version = "${ctx.spec.project.version}"
edition = "2021"

[dependencies]
axum = "0.6.20"
askama = "0.12"
tokio = { version = "=1.35.0", features = ["full"] }
tower = "0.4.13"
tower-http = { version = "0.4.0", features = ["fs", "trace"] }
tracing = "0.1.40"
tracing-subscriber = "0.3.18"
`,
        'toml',
        brickId,
        brickName,
        brickVersion,
        'Runtime web Rust avec rendu serveur Askama.'
      )
    );

    files.push(
      makeFile(
        'src/config.rs',
        `pub const HOST: &str = "127.0.0.1";
pub const PORT: u16 = 8080;
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Configuration réseau centralisée du serveur.'
      )
    );

    files.push(
      makeFile(
        'src/main.rs',
        `mod config;

use askama::Template;
use axum::{
    response::Html,
    routing::get,
    Router,
};
use std::net::SocketAddr;
use tower_http::{
    services::ServeDir,
    trace::TraceLayer,
};

#[derive(Template)]
#[template(path = "index.html")]
struct PageTemplate<'a> {
    project_name: &'a str,
    project_description: &'a str,
    project_version: &'a str,
    active_page: &'a str,
    page_title: &'a str,
    page_content: &'a str,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(false)
        .init();

    let app = Router::new()
        .route("/", get(home))
        .route("/dashboard", get(dashboard))
        .route("/workspace", get(workspace))
        .route("/profile", get(profile))
        .route("/settings", get(settings))
        .nest_service("/static", ServeDir::new("static"))
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], config::PORT));

    tracing::info!(
        "Rust Web Frontend listening on http://{}:{}",
        config::HOST,
        config::PORT
    );

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .expect("server error");
}

fn render_page(
    active_page: &'static str,
    page_title: &'static str,
    page_content: &'static str,
) -> Html<String> {
    let template = PageTemplate {
        project_name: "${ctx.spec.project.name}",
        project_description: "${ctx.spec.project.description}",
        project_version: "${ctx.spec.project.version}",
        active_page,
        page_title,
        page_content,
    };

    Html(template.render().expect("template rendering failed"))
}

async fn home() -> Html<String> {
    render_page(
        "home",
        "Home",
        "Point d'entrée de l'application.",
    )
}

async fn dashboard() -> Html<String> {
    render_page(
        "dashboard",
        "Dashboard",
        "Vue synthétique de l'application.",
    )
}

async fn workspace() -> Html<String> {
    render_page(
        "workspace",
        "Workspace",
        "Espace de travail principal de l'application.",
    )
}

async fn profile() -> Html<String> {
    render_page(
        "profile",
        "Dashboard / Profile",
        "Vue synthétique du profil utilisateur.",
    )
}

async fn settings() -> Html<String> {
    render_page(
        "settings",
        "Settings",
        "Paramètres et préférences de l'application.",
    )
}
`,
        'rust',
        brickId,
        brickName,
        brickVersion,
        'Routes Axum et rendu server-rendered des pages de fondation.'
      )
    );

    files.push(
      makeFile(
        'templates/layout.html',
        `<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="{{ project_description }}">
    <title>{{ page_title }} · {{ project_name }}</title>

    <link rel="icon" type="image/png" href="/static/favicon.png">
    <link rel="stylesheet" href="/static/css/tokens.css">
    <link rel="stylesheet" href="/static/css/style.css">
    <script src="/static/js/app.js" defer></script>
</head>
<body>

<div class="shell">

    {% include "components/header.html" %}

    <aside class="desktop-sidebar">
        {% include "components/navigation.html" %}
    </aside>

    <main class="content">
        <section class="stack">

            <div>
                <span class="eyebrow">Rust Web Foundation</span>
                <h1>{{ page_title }}</h1>
            </div>

            <div class="card">
                <p>{{ page_content }}</p>
            </div>

        </section>
    </main>

    <nav class="bottom-nav" aria-label="Navigation mobile">
        <a href="/" class="{% if active_page == "home" %}active{% endif %}">
            <span class="nav-icon" aria-hidden="true">⌂</span>
            <span>Home</span>
        </a>

        <a href="/dashboard" class="{% if active_page == "dashboard" %}active{% endif %}">
            <span class="nav-icon" aria-hidden="true">◈</span>
            <span>Dashboard</span>
        </a>

        <a href="/workspace" class="{% if active_page == "workspace" %}active{% endif %}">
            <span class="nav-icon" aria-hidden="true">□</span>
            <span>Workspace</span>
        </a>

        <button type="button" data-drawer-open>
            <span class="nav-icon" aria-hidden="true">☰</span>
            <span>Menu</span>
        </button>
    </nav>

    <div class="drawer" data-drawer aria-hidden="true">
        <div class="drawer-panel">

            <div class="drawer-head">
                <strong>{{ project_name }}</strong>

                <button
                    type="button"
                    data-drawer-close
                    aria-label="Fermer le menu">
                    ×
                </button>
            </div>

            {% include "components/navigation.html" %}

        </div>
    </div>

    {% include "components/footer.html" %}

</div>

</body>
</html>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Layout partagé responsive avec navigation et thème.'
      )
    );

    files.push(
      makeFile(
        'templates/index.html',
        `{% extends "layout.html" %}

{% block content %}
<section class="stack">

    <div>
        <span class="eyebrow">Rust Web Foundation</span>
        <h1>{{ project_name }}</h1>
        <p>{{ project_description }}</p>
    </div>

    <div class="grid">
        <article class="card">
            <div class="row">
                <div>
                    <h2>Architecture</h2>
                    <p>Serveur Web Rust basé sur Axum.</p>
                </div>
                <span class="badge">Axum</span>
            </div>
        </article>

        <article class="card">
            <div class="row">
                <div>
                    <h2>Rendering</h2>
                    <p>HTML généré côté serveur avec Askama.</p>
                </div>
                <span class="badge">Askama</span>
            </div>
        </article>

        <article class="card">
            <div class="row">
                <div>
                    <h2>Interface</h2>
                    <p>Design system responsive sans framework JavaScript.</p>
                </div>
                <span class="badge">Vanilla</span>
            </div>
        </article>
    </div>

    <div class="notice">
        <strong>Fondation opérationnelle</strong>
        <p>
            Le squelette est prêt à accueillir les pages et la logique métier
            du projet.
        </p>
    </div>

    <p class="muted">Version {{ project_version }}</p>

</section>
{% endblock %}
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Page d’accueil de démonstration de la fondation.'
      )
    );

    files.push(
      makeFile(
        'templates/dashboard.html',
        `{% extends "layout.html" %}

{% block content %}
<section class="stack">

    <div class="grid">
        <article class="card">
            <span class="muted">Status</span>
            <strong class="stat">Ready</strong>
        </article>

        <article class="card">
            <span class="muted">Framework</span>
            <strong class="stat">Axum</strong>
        </article>

        <article class="card">
            <span class="muted">Rendering</span>
            <strong class="stat">Askama</strong>
        </article>
    </div>

    <div class="notice">
        <strong>Dashboard de démonstration</strong>
        <p>
            Cette zone peut accueillir les indicateurs et informations
            principales de l’application.
        </p>
    </div>

</section>
{% endblock %}
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Dashboard générique de démonstration.'
      )
    );

    files.push(
      makeFile(
        'templates/workspace.html',
        `{% extends "layout.html" %}

{% block content %}
<section class="stack">

    <div class="card">
        <h2>Workspace</h2>
        <p>
            Espace principal destiné aux fonctionnalités et contenus
            spécifiques du projet.
        </p>
    </div>

    <div class="grid">
        <article class="card-link">
            <h3>Zone de travail</h3>
            <p class="muted">Emplacement pour le contenu principal.</p>
        </article>

        <article class="card-link">
            <h3>Ressources</h3>
            <p class="muted">Emplacement pour les ressources du projet.</p>
        </article>
    </div>

</section>
{% endblock %}
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Workspace générique de démonstration.'
      )
    );

    files.push(
      makeFile(
        'templates/profile.html',
        `{% extends "layout.html" %}

{% block content %}
<section class="stack">

    <div class="card">
        <h2>Profile</h2>
        <p>
            Cette page constitue le point d’entrée pour les informations
            personnelles et les préférences utilisateur.
        </p>
    </div>

    <div class="grid">
        <article class="card">
            <span class="muted">User</span>
            <strong class="stat">Demo</strong>
        </article>

        <article class="card">
            <span class="muted">Status</span>
            <strong class="stat">Active</strong>
        </article>
    </div>

</section>
{% endblock %}
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Dashboard de profil générique.'
      )
    );

    files.push(
      makeFile(
        'templates/settings.html',
        `{% extends "layout.html" %}

{% block content %}
<section class="stack">

    <div class="card">
        <h2>Settings</h2>
        <p>
            Cette page constitue le point d’entrée pour les paramètres
            et préférences du projet.
        </p>
    </div>

    <div class="list">
        <div class="list-item">
            <div>
                <strong>Theme</strong>
                <span class="muted">Dark / Light</span>
            </div>
        </div>

        <div class="list-item">
            <div>
                <strong>Interface</strong>
                <span class="muted">Responsive</span>
            </div>
        </div>
    </div>

</section>
{% endblock %}
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Page de configuration générique.'
      )
    );

    files.push(
      makeFile(
        'templates/components/header.html',
        `<header class="topbar">

    <a href="/" class="brand">
        <span class="brand-mark" aria-hidden="true">S</span>
        <span>{{ project_name }}</span>
    </a>

    <button
        type="button"
        class="theme-toggle"
        data-theme-toggle
        aria-label="Changer de thème">
        ◐
    </button>

</header>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Header partagé de l’application.'
      )
    );

    files.push(
      makeFile(
        'templates/components/navigation.html',
        `<nav class="desktop-tree" aria-label="Navigation principale">

    <div class="tree-hub open">

        <button
            class="tree-toggle"
            type="button"
            aria-expanded="true">
            <span class="tree-chevron" aria-hidden="true">›</span>
            <span>Home</span>
        </button>

        <div class="tree-children">
            <a href="/dashboard" class="{% if active_page == "dashboard" %}active{% endif %}">
                Dashboard
            </a>

            <a href="/workspace" class="{% if active_page == "workspace" %}active{% endif %}">
                Workspace
            </a>
        </div>

    </div>

    <div class="tree-hub">

        <button
            class="tree-toggle"
            type="button"
            aria-expanded="true">
            <span class="tree-chevron" aria-hidden="true">›</span>
            <span>Profile</span>
        </button>

        <div class="tree-children">
            <a href="/profile" class="{% if active_page == "profile" %}active{% endif %}">
                Dashboard / Profile
            </a>

            <a href="/settings" class="{% if active_page == "settings" %}active{% endif %}">
                Settings
            </a>
        </div>

    </div>

</nav>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Navigation générique responsive avec hubs et sous-pages.'
      )
    );

    files.push(
      makeFile(
        'templates/components/footer.html',
        `<footer class="footer">
    <span>{{ project_name }}</span>
    <span>Rust Web Foundation · {{ project_version }}</span>
</footer>
`,
        'html',
        brickId,
        brickName,
        brickVersion,
        'Footer partagé de l’application.'
      )
    );

    files.push(
      makeFile(
        'static/css/tokens.css',
        `:root {
    color-scheme: dark;

    --color-bg: #0f1115;
    --color-surface: #14171c;
    --color-surface-secondary: #181c22;
    --color-surface-tertiary: #1e232b;

    --color-text: #e7eaf0;
    --color-text-muted: #9aa3b2;
    --color-text-soft: #c4cad4;

    --color-border: #2a3039;
    --color-accent: #8fa7c2;

    --color-success: #78b892;
    --color-warning: #d3ad68;
    --color-danger: #c77b7b;
    --color-info: #7fa7c7;

    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;

    --shadow-sm: 0 2px 8px rgb(0 0 0 / 18%);

    --content-max: 1280px;
    --touch-target: 44px;

    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --space-7: 3rem;

    --font-body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.5rem;
    --font-size-2xl: 2rem;

    --sidebar-width: 240px;
    --topbar-height: 60px;
}

[data-theme="light"] {
    color-scheme: light;

    --color-bg: #f4f6f8;
    --color-surface: #ffffff;
    --color-surface-secondary: #f0f2f5;
    --color-surface-tertiary: #e7ebef;

    --color-text: #1c2229;
    --color-text-muted: #68717d;
    --color-text-soft: #3f4853;

    --color-border: #d7dde4;
    --color-accent: #526f8c;
}
`,
        'css',
        brickId,
        brickName,
        brickVersion,
        'Tokens structurels du design system SpecForge.'
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
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: var(--font-size-base);
    line-height: 1.6;
}

a {
    color: inherit;
    text-decoration: none;
}

button {
    font: inherit;
}

.shell {
    min-height: 100vh;
}

.topbar {
    position: sticky;
    top: 0;
    z-index: 30;
    height: var(--topbar-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-5);
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
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface-secondary);
}

.theme-toggle {
    width: var(--touch-target);
    height: var(--touch-target);
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
}

.theme-toggle:hover {
    background: var(--color-surface-secondary);
}

.desktop-sidebar {
    position: fixed;
    top: var(--topbar-height);
    bottom: 0;
    left: 0;
    width: var(--sidebar-width);
    overflow-y: auto;
    padding: var(--space-5);
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
}

.content {
    max-width: var(--content-max);
    margin-left: var(--sidebar-width);
    padding: var(--space-7);
}

.stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
}

.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4);
}

.card,
.card-link {
    padding: var(--space-5);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
}

.card-link {
    display: block;
    transition: border-color 120ms ease, transform 120ms ease;
}

.card-link:hover {
    border-color: var(--color-accent);
    transform: translateY(-1px);
}

.row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
}

.eyebrow {
    display: inline-block;
    margin-bottom: var(--space-2);
    color: var(--color-accent);
    font-size: var(--font-size-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.muted {
    color: var(--color-text-muted);
}

.badge {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface-secondary);
    color: var(--color-text-soft);
    font-size: var(--font-size-sm);
}

.stat {
    display: block;
    margin-top: var(--space-2);
    font-size: var(--font-size-xl);
}

.notice {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-secondary);
}

.list {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
}

.list-item:last-child {
    border-bottom: 0;
}

.desktop-tree {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

.tree-hub {
    display: flex;
    flex-direction: column;
}

.tree-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch-target);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-soft);
    text-align: left;
    cursor: pointer;
}

.tree-toggle:hover {
    background: var(--color-surface-secondary);
}

.tree-chevron {
    transition: transform 120ms ease;
}

.tree-hub.open .tree-chevron {
    transform: rotate(90deg);
}

.tree-children {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-left: var(--space-5);
}

.tree-children a {
    min-height: var(--touch-target);
    display: flex;
    align-items: center;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
}

.tree-children a:hover,
.tree-children a.active {
    background: var(--color-surface-secondary);
    color: var(--color-text);
}

.footer {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    margin-left: var(--sidebar-width);
    padding: var(--space-5) var(--space-7);
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
}

.bottom-nav,
.drawer {
    display: none;
}

@media (max-width: 900px) {
    .desktop-sidebar {
        display: none;
    }

    .content {
        margin-left: 0;
        padding: var(--space-5);
        padding-bottom: 96px;
    }

    .footer {
        margin-left: 0;
        padding: var(--space-5);
        padding-bottom: 96px;
    }

    .grid {
        grid-template-columns: 1fr;
    }

    .bottom-nav {
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 40;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        min-height: 72px;
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
    }

    .bottom-nav a,
    .bottom-nav button {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-1);
        border: 0;
        background: transparent;
        color: var(--color-text-muted);
        cursor: pointer;
    }

    .bottom-nav a.active,
    .bottom-nav a:hover,
    .bottom-nav button:hover {
        color: var(--color-text);
        background: var(--color-surface-secondary);
    }

    .nav-icon {
        font-size: 1.15rem;
    }

    .drawer {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: none;
        background: rgb(0 0 0 / 45%);
    }

    .drawer.open {
        display: block;
    }

    .drawer-panel {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(320px, 88vw);
        padding: var(--space-5);
        overflow-y: auto;
        background: var(--color-surface);
        border-left: 1px solid var(--color-border);
    }

    .drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-5);
    }

    .drawer-head button {
        width: var(--touch-target);
        height: var(--touch-target);
        border: 0;
        border-radius: var(--radius-md);
        background: transparent;
        color: var(--color-text);
        font-size: 1.5rem;
        cursor: pointer;
    }
}
`,
        'css',
        brickId,
        brickName,
        brickVersion,
        'Styles du design system responsive.'
      )
    );

    files.push(
      makeFile(
        'static/js/app.js',
        `(() => {
    const themeKey = 'specforge-theme';

    const applyTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
    };

    const storedTheme = localStorage.getItem(themeKey);

    if (storedTheme === 'light' || storedTheme === 'dark') {
        applyTheme(storedTheme);
    }

    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';

        applyTheme(next);
        localStorage.setItem(themeKey, next);
    });

    const drawer = document.querySelector('[data-drawer]');

    document.querySelector('[data-drawer-open]')?.addEventListener('click', () => {
        drawer?.classList.add('open');
        drawer?.setAttribute('aria-hidden', 'false');
    });

    const closeDrawer = () => {
        drawer?.classList.remove('open');
        drawer?.setAttribute('aria-hidden', 'true');
    };

    document.querySelector('[data-drawer-close]')?.addEventListener('click', closeDrawer);

    drawer?.addEventListener('click', (event) => {
        if (event.target === drawer) {
            closeDrawer();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDrawer();
        }
    });

    document.querySelectorAll('.tree-toggle').forEach((button) => {
        button.addEventListener('click', () => {
            const hub = button.closest('.tree-hub');

            if (!hub) {
                return;
            }

            const expanded = button.getAttribute('aria-expanded') === 'true';

            button.setAttribute('aria-expanded', String(!expanded));
            hub.classList.toggle('open', !expanded);
        });
    });
})();
`,
        'javascript',
        brickId,
        brickName,
        brickVersion,
        'Interactions minimales de thème, navigation mobile et arbre de navigation.'
      )
    );

    return files;
  },
};
