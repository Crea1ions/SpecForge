import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 1. Rust Backend Brick
export const rustBackendBrick: BrickDefinition = {
  id: 'rust-backend',
  name: 'Rust Backend Service',
  category: 'backend',
  version: '1.2.0',
  description: 'Service backend haute performance en Rust utilisant Tokio et Axum/Actix-web.',
  iconName: 'Cpu',
  provides: ['backend_runtime', 'async_runtime', 'memory_safe_core'],
  requires: [],
  applies: [{ backend: { enabled: true, language: 'rust' } }],
  backendStack: { language: 'rust', frameworks: ['axum'] },
  conflictsWith: ['python-backend'],
  templateFiles: ['Cargo.toml', 'src/main.rs', 'src/config.rs'],
  tags: ['rust', 'tokio', 'axum', 'performance', 'safe'],

  generateDecisions: (ctx) => [
    {
      id: 'ADR-001',
      title: `Sélection du runtime Rust (${ctx.spec.backend.framework})`,
      status: 'Accepted',
      context: 'Nécessité d\'un service backend fiable pour traiter la logique métier.',
      decision: `Adoption de Rust avec le framework ${ctx.spec.backend.framework} sur le port ${ctx.spec.backend.port}.`,
      consequences: [
        'Exécution déterministe avec typage statique strict.',
        'Consommation mémoire prévisible et latence réseau minimale.',
      ],
      generatingBrick: 'rust-backend',
    },
  ],

  generateFiles: (ctx) => {
        const { spec } = ctx;
    const files: GeneratedFile[] = [];

    // Détection d'un frontend à servir (React/Vite ou Askama SSR)
    const hasFrontend = ctx.activeBricks.some(
      (b) => b.id === 'react-vite' || b.id === 'rust-web-app'
    );
    const cargoToml = `[package]
name = "${spec.project.slug}"
version = "${spec.project.version}"
edition = "2021"
authors = ["${spec.project.author}"]
description = "${spec.project.description}"
license = "${spec.project.license}"

[dependencies]
tokio = { version = "1.38", features = ["full"] }
axum = { version = "0.7", features = ["json", "macros"] }
tower-http = { version = "0.5", features = [${hasFrontend ? '"cors", "trace", "fs"' : '"cors", "trace"'}] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
${spec.database.enabled && spec.database.type === 'sqlite' && spec.database.orm === 'sqlx' ? `sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite", "macros", "chrono"${spec.database.migrations ? ', "migrate"' : ''}] }` : ''}
${spec.database.enabled && spec.database.type === 'postgresql' && spec.database.orm === 'sqlx' ? `sqlx = { version = "0.7", features = ["runtime-tokio", "tls-rustls", "postgres", "macros", "chrono"${spec.database.migrations ? ', "migrate"' : ''}] }` : ''}
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true
`;
    files.push(
      makeFile(
        'Cargo.toml',
        cargoToml,
        'toml',
        'rust-backend',
        'Rust Backend Service',
        '1.2.0',
        'Manifeste Cargo officiel déclarant les dépendances Rust (Axum, Tokio, Serde).',
        'ADR-001'
      )
    );

            const mainRs = `//! ${spec.project.name} - Point d'entrée principal du backend Rust
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
${hasFrontend ? 'use tower_http::services::{ServeDir, ServeFile};' : ''}
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod api;
${spec.database.enabled ? 'mod db;' : ''}

use config::AppConfig;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::load();

    tracing::info!("🚀 Démarrage de {} v{}...", "${spec.project.name}", "${spec.project.version}");

    ${
      spec.database.enabled
        ? `let db_pool = db::init_database(&config.database_url).await?;
    tracing::info!("📦 Couche de persistance ${spec.database.type.toUpperCase()} connectée avec succès.");`
        : '// Aucune base de données requise.'
    }

    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);

    ${
      hasFrontend
        ? `// Sert le frontend buildé (dist/ copié dans ./static)
    let static_service = ServeDir::new("static")
        .not_found_service(ServeFile::new("static/index.html"));

    ${
      spec.database.enabled
        ? `let app = api::router()
        .fallback_service(static_service)
        .layer(cors)
        .with_state(db_pool);`
        : `let app = api::router()
        .fallback_service(static_service)
        .layer(cors);`
    }`
        : `${
            spec.database.enabled
              ? `let app = api::router()
        .layer(cors)
        .with_state(db_pool);`
              : `let app = api::router()
        .layer(cors);`
          }`
    }

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("🌐 Serveur HTTP en écoute sur http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
`;
    files.push(
      makeFile(
        'src/main.rs',
        mainRs,
        'rust',
        'rust-backend',
        'Rust Backend Service',
        '1.2.0',
        'Point d\'entrée du serveur Axum initialisant Tokio, le logging et le routeur.',
        'ADR-001'
      )
    );

    const configRs = `//! Configuration applicative
use std::env;

pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
}

impl AppConfig {
    pub fn load() -> Self {
        dotenvy::dotenv().ok();
        Self {
            port: env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(${spec.backend.port}),
            database_url: env::var("DATABASE_URL").unwrap_or_else(|_| "${
              spec.database.type === 'sqlite' ? 'sqlite://data.db' : 'postgres://postgres:postgres@localhost:5432/app'
            }".to_string()),
        }
    }
}
`;
    files.push(
      makeFile(
        'src/config.rs',
        configRs,
        'rust',
        'rust-backend',
        'Rust Backend Service',
        '1.2.0',
        'Chargeur de configuration environnementale découplé avec variables typées.'
      )
    );

        // .env.example — variables d'environnement de référence
    files.push(
      makeFile(
        '.env.example',
        `# Configuration locale — copier en .env et adapter
PORT=${spec.backend.port}
DATABASE_URL=${
          spec.database.type === 'sqlite'
            ? 'sqlite://data.db'
            : 'postgres://postgres:postgres@localhost:5432/app'
        }
RUST_LOG=info
`,
        'bash',
        'rust-backend',
        'Rust Backend Service',
        '1.2.0',
        'Variables d’environnement de référence pour le développement local.'
      )
    );

    return files;
  },
};
