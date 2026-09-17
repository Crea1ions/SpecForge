/**
 * SpecForge - Modular Brick Library (Section 5 & 12)
 * Each brick is an autonomous software component that declares:
 * - provides: what capabilities it brings
 * - requires: what capabilities it strictly depends on
 * - compatibleWith: compatible peers
 * - conflictsWith: conflicting peers
 * - generateFiles: its own code & template generation logic
 * - generateDecisions: its contextual architectural decisions (ADRs)
 *
 * This completely decouples templates from the generation engine core.
 */

import { BrickDefinition, GenerationContext, GeneratedFile, ArchitecturalDecision } from '../types';
import { getContentByteLength } from '../utils';

function makeFile(
  path: string,
  content: string,
  language: GeneratedFile['language'],
  brickId: string,
  brickName: string,
  brickVersion: string,
  reason: string,
  decisionRef?: string
): GeneratedFile {
  return {
    path,
    content: content.trimStart(),
    language,
    size: getContentByteLength(content),
    brickId,
    brickName,
    brickVersion,
    reason,
    decisionRef,
  };
}

// 1. Rust Backend Brick
const rustBackendBrick: BrickDefinition = {
  id: 'rust-backend',
  name: 'Rust Backend Service',
  category: 'backend',
  version: '1.2.0',
  description: 'Service backend haute performance en Rust utilisant Tokio et Axum/Actix-web.',
  iconName: 'Cpu',
  provides: ['backend_runtime', 'async_runtime', 'memory_safe_core'],
  requires: [],
  compatibleWith: ['react-vite', 'tauri-desktop', 'sqlite-storage', 'postgres-storage', 'rest-api', 'docker-infra'],
  conflictsWith: ['python-backend'],
  options: [
    {
      key: 'framework',
      label: 'Framework Web',
      type: 'select',
      default: 'axum',
      options: [
        { value: 'axum', label: 'Axum (Tokio officiel, routing moderne)' },
        { value: 'actix-web', label: 'Actix-web (Ultra rapide, mature)' },
      ],
      description: 'Moteur de routage HTTP.',
    },
    {
      key: 'port',
      label: 'Port TCP',
      type: 'number',
      default: 8080,
      description: 'Port d\'écoute du serveur.',
    },
  ],
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
tower-http = { version = "0.5", features = ["cors", "trace"] }
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
use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
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
        ? `let db_pool = db::init_database().await?;
    tracing::info!("📦 Couche de persistance ${spec.database.type.toUpperCase()} connectée avec succès.");`
        : '// Aucune base de données requise.'
    }

    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);

    ${
      spec.database.enabled
        ? `let app = Router::new()
        .route("/api/health", get(api::health_check))
        .route("/api/items", get(api::list_items).post(api::create_item))
        .layer(cors)
        .with_state(db_pool);`
        : `let app = Router::new()
        .route("/api/health", get(api::health_check))
        .route("/api/items", get(api::list_items).post(api::create_item))
        .layer(cors);`
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

    return files;
  },
};

// 2. Python FastAPI Backend Brick
const pythonBackendBrick: BrickDefinition = {
  id: 'python-backend',
  name: 'Python FastAPI Backend',
  category: 'backend',
  version: '1.1.0',
  description: 'Backend moderne et rapide en Python avec typage Pydantic et documentation OpenAPI automatique.',
  iconName: 'FileCode2',
  provides: ['backend_runtime', 'ai_ready_core'],
  requires: [],
  compatibleWith: ['react-vite', 'sqlite-storage', 'postgres-storage', 'rest-api', 'docker-infra'],
  conflictsWith: ['rust-backend'],
  options: [
    {
      key: 'port',
      label: 'Port HTTP',
      type: 'number',
      default: 8000,
      description: 'Port d\'écoute Uvicorn.',
    },
  ],
  templateFiles: ['pyproject.toml', 'main.py', 'requirements.txt'],
  tags: ['python', 'fastapi', 'pydantic', 'asyncio'],

  generateDecisions: (ctx) => [
    {
      id: 'ADR-001',
      title: 'Sélection du runtime Python (FastAPI)',
      status: 'Accepted',
      context: 'Nécessité d\'un backend dynamique compatible avec l\'écosystème IA et manipulation de données.',
      decision: `Adoption de Python avec FastAPI sur le port ${ctx.spec.backend.port}.`,
      consequences: ['Documentation OpenAPI interactive générée automatiquement sur /docs.'],
      generatingBrick: 'python-backend',
    },
  ],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    const reqs = `fastapi>=0.111.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0
python-dotenv>=1.0.0
${spec.database.enabled ? 'sqlalchemy>=2.0.0' : ''}
`;
    files.push(
      makeFile(
        'requirements.txt',
        reqs,
        'bash',
        'python-backend',
        'Python FastAPI Backend',
        '1.1.0',
        'Fichier de dépendances Python pip (FastAPI, Uvicorn, Pydantic).'
      )
    );

    const mainPy = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI(title="${spec.project.name}", version="${spec.project.version}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "${spec.project.name}",
        "version": "${spec.project.version}",
        "database": "${spec.database.enabled ? spec.database.type : 'none'}"
    }

@app.get("/api/items")
def list_items():
    return [
        {"id": 1, "title": "Configuration initiale", "completed": True},
        {"id": 2, "title": "Service API Python", "completed": True}
    ]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=${spec.backend.port}, reload=True)
`;
    files.push(
      makeFile(
        'main.py',
        mainPy,
        'typescript',
        'python-backend',
        'Python FastAPI Backend',
        '1.1.0',
        'Point d\'entrée applicatif FastAPI avec middleware CORS et routes de santé.'
      )
    );

    return files;
  },
};

// 3. React + Vite Frontend Brick
const reactViteBrick: BrickDefinition = {
  id: 'react-vite',
  name: 'React 19 + Vite Frontend',
  category: 'frontend',
  version: '2.1.0',
  description: 'Application Single-Page moderne avec React 19, Vite, TypeScript et Tailwind CSS.',
  iconName: 'Layout',
  provides: ['ui_client', 'spa_bundle'],
  requires: [],
  compatibleWith: ['rust-backend', 'python-backend', 'tauri-desktop', 'rest-api'],
  conflictsWith: [],
  options: [
    {
      key: 'styling',
      label: 'Moteur CSS',
      type: 'select',
      default: 'tailwind',
      options: [
        { value: 'tailwind', label: 'Tailwind CSS (Classes utilitaires modernes)' },
        { value: 'css', label: 'CSS Modules classiques' },
      ],
      description: 'Système de style.',
    },
  ],
  templateFiles: [
    'frontend/package.json',
    'frontend/index.html',
    'frontend/vite.config.ts',
    'frontend/tsconfig.json',
    'frontend/tsconfig.app.json',
    'frontend/tsconfig.node.json',
    'frontend/src/main.tsx',
    'frontend/src/App.tsx',
    'frontend/src/index.css',
  ],
  tags: ['react', 'vite', 'typescript', 'tailwind'],

  generateDecisions: () => [
    {
      id: 'ADR-002',
      title: 'Adoption du frontend React 19 avec Vite',
      status: 'Accepted',
      context: 'Nécessité d\'une interface moderne et performante.',
      decision: 'Intégration de React 19 compilé par Vite avec Tailwind CSS.',
      consequences: [
        'Builds HMR instantanés en développement.',
        'Architecture SPA découplée du backend.',
      ],
      generatingBrick: 'react-vite',
    },
  ],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    const pkg = `{
  "name": "${spec.project.slug}-frontend",
  "private": true,
  "version": "${spec.project.version}",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.7.2",
    "vite": "^6.0.3",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
`;
    files.push(
      makeFile(
        'frontend/package.json',
        pkg,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Manifeste npm déclarant React 19, Tailwind CSS et Vite pour l\'interface utilisateur.',
        'ADR-002'
      )
    );

    const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${spec.project.name}</title>
  </head>
  <body class="bg-neutral-950 text-neutral-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    files.push(
      makeFile(
        'frontend/index.html',
        indexHtml,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Point d\'entrée HTML racine requis par Vite pour charger et monter l\'application.'
      )
    );

    const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:${spec.backend.port}',
        changeOrigin: true,
      },
    },
  },
});
`;
    files.push(
      makeFile(
        'frontend/vite.config.ts',
        viteConfig,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Configuration du bundler Vite avec reverse-proxy automatique vers le backend.'
      )
    );

    const tsconfigJson = `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`;
    files.push(
      makeFile(
        'frontend/tsconfig.json',
        tsconfigJson,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Fichier de configuration TypeScript racine orchestrant les références de projet (tsc -b).'
      )
    );

    const tsconfigAppJson = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;
    files.push(
      makeFile(
        'frontend/tsconfig.app.json',
        tsconfigAppJson,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Configuration du compilateur TypeScript pour les composants et fichiers sources de l\'application.'
      )
    );

    const tsconfigNodeJson = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
`;
    files.push(
      makeFile(
        'frontend/tsconfig.node.json',
        tsconfigNodeJson,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Configuration TypeScript pour les scripts d\'outillage Node et Vite.'
      )
    );

    const mainTsx = `import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
`;
    files.push(
      makeFile(
        'frontend/src/main.tsx',
        mainTsx,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Point d\'entrée applicatif montant le composant racine App dans le DOM.'
      )
    );

    const appTsx = `import React, { useState, useEffect } from 'react';
import { Server, Database, ShieldCheck, RefreshCw } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health');
      if (res.ok) setHealth(await res.json());
      const itemsRes = await fetch('/api/items');
      if (itemsRes.ok) setItems(await itemsRes.json());
    } catch (err) {
      console.warn('Backend en attente...', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">${spec.project.name}</h1>
          <p className="text-xs text-neutral-400 mt-0.5">${spec.project.description}</p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs"
        >
          <RefreshCw className={\`w-3 h-3 \${loading ? 'animate-spin' : ''}\`} />
          Rafraîchir
        </button>
      </header>
      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-2">
            <Server className="w-4 h-4" /> Backend
          </div>
          <p className="text-xs text-neutral-300">Runtime : ${spec.backend.language.toUpperCase()}</p>
          <p className="text-xs text-neutral-300 mt-1">Port : ${spec.backend.port}</p>
        </div>
        <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-2">
            <Database className="w-4 h-4" /> Persistance
          </div>
          <p className="text-xs text-neutral-300">${spec.database.enabled ? spec.database.type.toUpperCase() : 'Aucune'}</p>
        </div>
        <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-2">
            <ShieldCheck className="w-4 h-4" /> Authentification
          </div>
          <p className="text-xs text-neutral-300">${spec.authentication.enabled ? spec.authentication.provider.toUpperCase() : 'Désactivée'}</p>
        </div>
      </main>
    </div>
  );
}
`;
    files.push(
      makeFile(
        'frontend/src/App.tsx',
        appTsx,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Composant racine React connecté aux routes de santé et données du backend.'
      )
    );

    files.push(
      makeFile(
        'frontend/src/index.css',
        '@import "tailwindcss";\n',
        'css',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Point d\'entrée Tailwind CSS.'
      )
    );

    return files;
  },
};

// 4. Tauri Desktop Brick
const tauriDesktopBrick: BrickDefinition = {
  id: 'tauri-desktop',
  name: 'Tauri Desktop Wrapper',
  category: 'frontend',
  version: '1.4.2',
  description: 'Pont d\'application de bureau ultra-léger reliant l\'interface web au binaire Rust.',
  iconName: 'Monitor',
  provides: ['desktop_runtime', 'backend_runtime', 'native_fs_access', 'system_tray'],
  requires: ['react-vite'],
  compatibleWith: ['rust-backend', 'react-vite', 'sqlite-storage'],
  conflictsWith: ['python-backend', 'docker-infra'],
  options: [
    {
      key: 'identifier',
      label: 'App Bundle Identifier',
      type: 'string',
      default: 'com.specforge.app',
      description: 'Identifiant unique de paquet pour l\'OS.',
    },
  ],
  templateFiles: ['src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json', 'src-tauri/src/main.rs'],
  tags: ['desktop', 'tauri', 'rust', 'lightweight'],

  generateDecisions: () => [
    {
      id: 'ADR-004',
      title: 'Embarquement Desktop natif via Tauri',
      status: 'Accepted',
      context: 'Distribution de l\'application sous forme de logiciel exécutable sans navigateur requis.',
      decision: 'Intégration de Tauri reliant directement l\'UI React au binaire Rust natif.',
      consequences: [
        'Taille finale du binaire inférieure à 15 Mo.',
        'Accès direct aux APIs du système d\'exploitation en toute sécurité.',
      ],
      generatingBrick: 'tauri-desktop',
    },
  ],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    const conf = `{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "${spec.project.name}",
  "version": "${spec.project.version}",
  "identifier": "com.specforge.${spec.project.slug}",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../frontend/dist"
  },
  "app": {
    "windows": [
      {
        "title": "${spec.project.name}",
        "width": 1024,
        "height": 720,
        "resizable": true
      }
    ]
  }
}
`;
    files.push(
      makeFile(
        'src-tauri/tauri.conf.json',
        conf,
        'json',
        'tauri-desktop',
        'Tauri Desktop Wrapper',
        '1.4.2',
        'Configuration officielle Tauri (taille fenêtre, builds, bundle ID).'
      )
    );

    const cargo = `[package]
name = "${spec.project.slug}-tauri"
version = "${spec.project.version}"
edition = "2021"

[dependencies]
tauri = { version = "2.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
${spec.database.enabled && spec.database.type === 'sqlite' && spec.database.orm === 'sqlx'
  ? `tokio = { version = "1.38", features = ["macros", "rt-multi-thread"] }
sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite", "macros", "chrono"${spec.database.migrations ? ', "migrate"' : ''}] }`
  : ''}
`;
    files.push(
      makeFile(
        'src-tauri/Cargo.toml',
        cargo,
        'toml',
        'tauri-desktop',
        'Tauri Desktop Wrapper',
        '1.4.2',
        'Manifeste Cargo pour les dépendances natives de la couche Tauri.'
      )
    );

    const main = `// Empêche l'ouverture d'une fenêtre de commande Windows en release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Bonjour {}, bienvenue sur {} !", name, "${spec.project.name}")
}

  mod db;

  #[tokio::main]
  async fn main() -> Result<(), Box<dyn std::error::Error>> {
      let db_pool = db::init_database().await?;

      tauri::Builder::default()
          .manage(db_pool)
          .invoke_handler(tauri::generate_handler![greet])
          .run(tauri::generate_context!())
          .expect("Erreur lors de l'exécution de l'application Tauri");

      Ok(())
  }
`;
    files.push(
      makeFile(
        'src-tauri/src/main.rs',
        main,
        'rust',
        'tauri-desktop',
        'Tauri Desktop Wrapper',
        '1.4.2',
        'Hôte natif Tauri déclarant les commandes IPC invocables depuis l\'UI.'
      )
    );

    return files;
  },
};

// 5. SQLite Storage Brick
const sqliteStorageBrick: BrickDefinition = {
  id: 'sqlite-storage',
  name: 'SQLite Local Database',
  category: 'database',
  version: '1.0.0',
  description: 'Base relationnelle embarquée sans serveur, idéale pour desktop et microservices autonomes.',
  iconName: 'Database',
  provides: ['sql_storage', 'embedded_persistence'],
  requires: ['backend_runtime'],
  compatibleWith: ['rust-backend', 'python-backend', 'tauri-desktop'],
  conflictsWith: ['postgres-storage'],
  options: [],
  templateFiles: ['src/db.rs', 'migrations/0001_initial.sql'],
  tags: ['sqlite', 'sqlx', 'embedded', 'zero-config'],

  generateDecisions: (ctx) => [
    {
      id: 'ADR-003',
      title: 'Persistance locale via SQLite embarqué (SQLx)',
      status: 'Accepted',
      context: 'Besoin d\'un stockage relationnel sans infrastructure serveur séparée.',
      decision: `Utilisation de SQLite avec ${ctx.spec.database.orm}, ${ctx.spec.database.pooling ? 'pool de connexions' : 'connexion dédiée unitaire (single-connection)'} et ${ctx.spec.database.migrations ? 'migrations versionnées' : 'initialisation directe'}.`,
      consequences: ['Zéro coût d\'infrastructure et persistance asynchrone dans un fichier local data.db.'],
      generatingBrick: 'sqlite-storage',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];
    if (ctx.spec.backend.language === 'rust') {
      const isTauriDesktop =
        ctx.spec.project.type === 'desktop' && ctx.spec.frontend.tauri;
      const dbPath = isTauriDesktop ? 'src-tauri/db.rs' : 'src/db.rs';
      const migrationPath = isTauriDesktop
        ? 'src-tauri/migrations/0001_initial.sql'
        : 'migrations/0001_initial.sql';
      const migrationDir = isTauriDesktop ? '../migrations' : './migrations';

      const dbRs = `//! Initialisation SQLite avec SQLx
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
};
use std::{env, str::FromStr};

pub async fn init_database() -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let db_url = env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://data.db".to_string());
    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true);

    ${
      ctx.spec.database.pooling
        ? `// Pooling activé : gestion dynamique d'un pool de 5 connexions
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;`
        : `// Mode sans pooling : connexion dédiée stricte (max_connections = 1, pas de pool dynamique)
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;`
    }

    ${
      ctx.spec.database.migrations
        ? `// Exécution des migrations SQLx versionnées
    sqlx::migrate!("${migrationDir}")
        .run(&pool)
        .await?;`
        : `// Création directe sans mécanisme de migration
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(&pool)
    .await?;`
    }

    Ok(pool)
}
`;
      files.push(
        makeFile(
            dbPath,
          dbRs,
          'rust',
          'sqlite-storage',
          'SQLite Local Database',
          '1.1.0',
          'Gestionnaire de connexion SQLx et pool SQLite.',
          'ADR-003'
        )
      );

      if (ctx.spec.database.migrations) {
        const migrationSql = `-- Migration initiale générée par SpecForge pour SQLx
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
        files.push(
          makeFile(
            migrationPath,
            migrationSql,
            'sql',
            'sqlite-storage',
            'SQLite Local Database',
            '1.1.0',
            'Fichier de migration SQL initial exécuté par sqlx::migrate!.',
            'ADR-003'
          )
        );
      }
    }
    return files;
  },
};

// 6. PostgreSQL Storage Brick
const postgresStorageBrick: BrickDefinition = {
  id: 'postgres-storage',
  name: 'PostgreSQL Enterprise Storage',
  category: 'database',
  version: '1.2.1',
  description: 'Moteur de base relationnelle puissant pour charges intensives et architectures distribuées.',
  iconName: 'Layers',
  provides: ['sql_storage', 'distributed_persistence', 'acid_transactions'],
  requires: ['backend_runtime'],
  compatibleWith: ['rust-backend', 'python-backend', 'docker-infra'],
  conflictsWith: ['sqlite-storage', 'tauri-desktop'],
  options: [],
  templateFiles: ['src/db.rs', 'migrations/0001_initial.sql'],
  tags: ['postgresql', 'sqlx', 'scalable'],

  generateDecisions: () => [
    {
      id: 'ADR-003',
      title: 'Persistance d\'entreprise via PostgreSQL',
      status: 'Accepted',
      context: 'Nécessité de supporter de multiples transactions concurrentes et une forte charge.',
      decision: 'Adoption de PostgreSQL avec pooling de connexions.',
      consequences: ['Nécessite un conteneur ou serveur PostgreSQL démarré.'],
      generatingBrick: 'postgres-storage',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];
    if (ctx.spec.backend.language === 'rust') {
      const dbRs = `//! Initialisation PostgreSQL
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn init_database() -> Result<PgPool, Box<dyn std::error::Error>> {
    let db_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/app".to_string());
    ${
      ctx.spec.database.pooling
        ? `// Pooling activé : gestion dynamique d'un pool de 10 connexions
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&db_url)
        .await?;`
        : `// Mode sans pooling : connexion dédiée stricte (max_connections = 1, pas de pool dynamique)
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&db_url)
        .await?;`
    }

    ${
      ctx.spec.database.migrations
        ? `// Exécution des migrations SQLx versionnées
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;`
        : `// Création directe sans mécanisme de migration
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS items (
            id BIGSERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )"
    )
    .execute(&pool)
    .await?;`
    }

    Ok(pool)
}
`;
      files.push(
        makeFile(
          'src/db.rs',
          dbRs,
          'rust',
          'postgres-storage',
          'PostgreSQL Enterprise Storage',
          '1.2.1',
          'Gestionnaire de connexion SQLx et pool PostgreSQL.',
          'ADR-003'
        )
      );

      if (ctx.spec.database.migrations) {
        const migrationSql = `-- Migration initiale PostgreSQL générée par SpecForge pour SQLx
CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
`;
        files.push(
          makeFile(
            'migrations/0001_initial.sql',
            migrationSql,
            'sql',
            'postgres-storage',
            'PostgreSQL Enterprise Storage',
            '1.2.1',
            'Fichier de migration SQL initial exécuté par sqlx::migrate!.',
            'ADR-003'
          )
        );
      }
    }
    return files;
  },
};

// 7. REST API Brick
const restApiBrick: BrickDefinition = {
  id: 'rest-api',
  name: 'RESTful API Engine',
  category: 'api',
  version: '1.3.0',
  description: 'Contrats d\'API REST avec sérialisation JSON, endpoints CRUD et tests de vivacité.',
  iconName: 'Network',
  provides: ['rest_server', 'json_serialization', 'health_probes'],
  requires: ['backend_runtime'],
  compatibleWith: ['rust-backend', 'python-backend', 'react-vite'],
  conflictsWith: [],
  options: [],
  templateFiles: ['src/api.rs'],
  tags: ['rest', 'json', 'crud'],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];
    if (ctx.spec.backend.language === 'rust') {
      const isSqlite = ctx.spec.database.enabled && ctx.spec.database.type === 'sqlite';
      const apiRs = isSqlite
        ? `//! Contrôleurs REST connectés à SQLite via SQLx
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
}

pub async fn health_check() -> impl IntoResponse {
    Json(HealthResponse {
        status: "healthy",
        service: "${ctx.spec.project.name}",
        version: "${ctx.spec.project.version}",
    })
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Item {
    pub id: i64,
    pub title: String,
    pub completed: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateItemRequest {
    pub title: String,
}

pub async fn list_items(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<Item>>, StatusCode> {
    let items = sqlx::query_as::<_, Item>("SELECT id, title, completed FROM items ORDER BY id ASC")
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(items))
}

pub async fn create_item(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateItemRequest>,
) -> Result<(StatusCode, Json<Item>), StatusCode> {
    let result = sqlx::query("INSERT INTO items (title, completed) VALUES (?, 0)")
        .bind(&payload.title)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let id = result.last_insert_rowid();
    let item = Item {
        id,
        title: payload.title,
        completed: false,
    };
    Ok((StatusCode::CREATED, Json(item)))
}
`
        : `//! Contrôleurs REST
use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
}

pub async fn health_check() -> impl IntoResponse {
    Json(HealthResponse {
        status: "healthy",
        service: "${ctx.spec.project.name}",
        version: "${ctx.spec.project.version}",
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Item {
    pub id: u64,
    pub title: String,
    pub completed: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateItemRequest {
    pub title: String,
}

pub async fn list_items() -> impl IntoResponse {
    let items = vec![
        Item { id: 1, title: "Spécification validée".to_string(), completed: true },
        Item { id: 2, title: "Moteur déterministe".to_string(), completed: true },
    ];
    Json(items)
}

pub async fn create_item(Json(payload): Json<CreateItemRequest>) -> impl IntoResponse {
    let item = Item {
        id: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64,
        title: payload.title,
        completed: false,
    };
    (StatusCode::CREATED, Json(item))
}
`;
      files.push(
        makeFile(
          'src/api.rs',
          apiRs,
          'rust',
          'rest-api',
          'RESTful API Engine',
          '1.3.0',
          'Gestionnaires de requêtes REST (Health check, CRUD items) avec sérialisation JSON.'
        )
      );
    }
    return files;
  },
};

// 8. Docker Infrastructure Brick
const dockerInfraBrick: BrickDefinition = {
  id: 'docker-infra',
  name: 'Docker & Multi-Stage Compose',
  category: 'infrastructure',
  version: '1.5.0',
  description: 'Conteneurisation reproductible avec builds multi-étapes légers (Alpine Linux).',
  iconName: 'Box',
  provides: ['container_image', 'compose_orchestration'],
  requires: ['backend_runtime'],
  compatibleWith: ['rust-backend', 'python-backend', 'react-vite', 'postgres-storage'],
  conflictsWith: ['tauri-desktop'],
  options: [],
  templateFiles: ['Dockerfile', 'docker-compose.yml'],
  tags: ['docker', 'compose', 'containers'],

  generateDecisions: () => [
    {
      id: 'ADR-005',
      title: 'Conteneurisation multi-étapes via Docker',
      status: 'Accepted',
      context: 'Garantir la parité stricte entre environnement local et production.',
      decision: 'Utilisation d\'une image Alpine minimale avec compilation multi-étapes.',
      consequences: ['Image de production allégée et isolée.'],
      generatingBrick: 'docker-infra',
    },
  ],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    const dockerfile = `# Dockerfile multi-étapes généré par SpecForge
FROM rust:1.80-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/${spec.project.slug} /app/server
ENV PORT=${spec.backend.port}
EXPOSE ${spec.backend.port}
CMD ["/app/server"]
`;
    files.push(
      makeFile(
        'Dockerfile',
        dockerfile,
        'dockerfile',
        'docker-infra',
        'Docker & Multi-Stage Compose',
        '1.5.0',
        'Définition de conteneur multi-étapes légère et sécurisée (Alpine Linux).',
        'ADR-005'
      )
    );

    if (spec.infrastructure.compose) {
      const compose = `services:
  app:
    build: .
    ports:
      - "${spec.backend.port}:${spec.backend.port}"
    environment:
      - PORT=${spec.backend.port}
      ${spec.database.enabled && spec.database.type === 'postgresql' ? '- DATABASE_URL=postgres://postgres:postgres@db:5432/app' : ''}
    ${spec.database.enabled && spec.database.type === 'postgresql' ? 'depends_on:\n      db:\n        condition: service_healthy' : ''}
    restart: unless-stopped

${
  spec.database.enabled && spec.database.type === 'postgresql'
    ? `  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
`
    : ''
}
`;
      files.push(
        makeFile(
          'docker-compose.yml',
          compose,
          'yaml',
          'docker-infra',
          'Docker & Multi-Stage Compose',
          '1.5.0',
          'Orchestration des conteneurs applicatif et persistance en local.'
        )
      );
    }

    return files;
  },
};

// 9. Quality Suite Brick
const qualitySuiteBrick: BrickDefinition = {
  id: 'quality-suite',
  name: 'Quality, Tests & GitHub Actions CI',
  category: 'quality',
  version: '1.3.0',
  description: 'Suite automatisée de tests, formateur et pipeline GitHub Actions CI.',
  iconName: 'CheckCircle2',
  provides: ['ci_pipeline', 'linter_config', 'unit_tests'],
  requires: [],
  compatibleWith: ['rust-backend', 'python-backend', 'react-vite', 'tauri-desktop'],
  conflictsWith: [],
  options: [],
  templateFiles: [
    '.github/workflows/ci.yml',
    '.gitignore',
    'tests/smoke_test.rs',
    'rustfmt.toml',
    'frontend/.eslintrc.json',
  ],
  tags: ['ci', 'tests', 'github-actions'],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    const gitignore = `target/
dist/
node_modules/
*.db
*.sqlite
.env
.DS_Store
`;
    files.push(
      makeFile(
        '.gitignore',
        gitignore,
        'bash',
        'quality-suite',
        'Quality, Tests & GitHub Actions CI',
        '1.3.0',
        'Exclusion des artefacts de build et données sensibles pour Git.'
      )
    );

    if (spec.quality.tests) {
      if (spec.backend.enabled && spec.backend.language === 'rust') {
        const smokeTest = `//! Smoke tests et vérification structurelle générés par SpecForge

#[test]
fn test_project_metadata() {
    let app_name = "${spec.project.name}";
    let version = "${spec.project.version}";
    assert!(!app_name.is_empty(), "Le nom du projet ne doit pas être vide");
    assert!(!version.is_empty(), "La version du projet ne doit pas être vide");
}

#[test]
fn test_server_port_configuration() {
    let port: u16 = ${spec.backend.port};
    assert!(port > 0, "Le port d'écoute configuré doit être supérieur à zéro");
}
`;
        files.push(
          makeFile(
            'tests/smoke_test.rs',
            smokeTest,
            'rust',
            'quality-suite',
            'Quality, Tests & GitHub Actions CI',
            '1.3.0',
            'Smoke test unitaire et d\'intégration pour validation du contrat backend.'
          )
        );
      }
    }

    if (spec.quality.lint) {
      if (spec.backend.enabled && spec.backend.language === 'rust') {
        const rustfmt = `# Configuration du formateur et linter de style Rust (rustfmt)
edition = "2021"
max_width = 100
newline_style = "Unix"
use_small_heuristics = "Default"
`;
        files.push(
          makeFile(
            'rustfmt.toml',
            rustfmt,
            'toml',
            'quality-suite',
            'Quality, Tests & GitHub Actions CI',
            '1.3.0',
            'Configuration de style et de formatage de code pour rustfmt.'
          )
        );
      }

      if (spec.frontend.enabled && spec.frontend.framework === 'react') {
        const eslintConfig = `{
  "env": {
    "browser": true,
    "es2020": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off"
  }
}
`;
        files.push(
          makeFile(
            'frontend/.eslintrc.json',
            eslintConfig,
            'json',
            'quality-suite',
            'Quality, Tests & GitHub Actions CI',
            '1.3.0',
            'Configuration ESLint minimale pour l\'interface utilisateur React/TypeScript.'
          )
        );
      }
    }

    if (spec.quality.ci) {
      const ci = `name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Rust Toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - name: Format
        run: cargo fmt --check
      - name: Tests
        run: cargo test
`;
      files.push(
        makeFile(
          '.github/workflows/ci.yml',
          ci,
          'yaml',
          'quality-suite',
          'Quality, Tests & GitHub Actions CI',
          '1.3.0',
          'Pipeline d\'intégration continue automatisé déclenché sur push et pull requests.'
        )
      );
    }

    return files;
  },
};

// 10. Documentation Pack Brick
const docsPackBrick: BrickDefinition = {
  id: 'docs-pack',
  name: 'Architecture & Developer Documentation',
  category: 'documentation',
  version: '1.2.0',
  description: 'Dossier complet de documentation : README, architecture, installation pas à pas et ADRs.',
  iconName: 'BookOpen',
  provides: ['dev_documentation', 'architecture_records', 'onboarding_guide'],
  requires: [],
  compatibleWith: [],
  conflictsWith: [],
  options: [],
  templateFiles: ['README.md', 'docs/ARCHITECTURE.md', 'docs/INSTALL.md', 'docs/DECISIONS.md'],
  tags: ['docs', 'adr', 'readme'],

  generateFiles: (ctx) => {
    const { spec, activeBricks, decisions } = ctx;
    const files: GeneratedFile[] = [];

    if (spec.documentation.readme) {
      const readme = `# ${spec.project.name}

> ${spec.project.description}

Projet généré par **SpecForge** selon les principes **Specification-First**.  
Source de vérité : \`project.yaml\`.

## 🏛️ Architecture Résolue
- **Type de projet :** \`${spec.project.type}\`
- **Backend :** ${spec.backend.enabled ? `\`${spec.backend.language.toUpperCase()}\` (${spec.backend.framework}) sur port ${spec.backend.port}` : '_Aucun_'}
- **Frontend :** ${spec.frontend.enabled ? `\`${spec.frontend.framework.toUpperCase()}\` avec \`${spec.frontend.bundler}\`` : '_Aucun_'}
- **Stockage :** ${spec.database.enabled ? `\`${spec.database.type.toUpperCase()}\`` : '_Aucun_'}
- **Docker :** ${spec.infrastructure.docker ? 'Actif' : 'Désactivé'}

## 🚀 Démarrage Rapide
\`\`\`bash
${spec.backend.language === 'rust' ? 'cargo run' : 'python main.py'}
\`\`\`
`;
      files.push(
        makeFile(
          'README.md',
          readme,
          'markdown',
          'docs-pack',
          'Architecture & Developer Documentation',
          '1.2.0',
          'Documentation d\'accueil et guide de démarrage rapide.'
        )
      );
    }

    if (spec.documentation.architectureDoc) {
      const arch = `# Dossier d'Architecture — ${spec.project.name}

## 1. Source de Vérité
Toute décision d'architecture provient du fichier \`project.yaml\`.

## 2. Briques Activées
| Brique | Version | Catégorie |
|---|---|---|
${activeBricks.map((b) => `| ${b.name} | \`${b.version}\` | \`${b.category}\` |`).join('\n')}
`;
      files.push(
        makeFile(
          'docs/ARCHITECTURE.md',
          arch,
          'markdown',
          'docs-pack',
          'Architecture & Developer Documentation',
          '1.2.0',
          'Dossier technique d\'architecture logicielle.'
        )
      );
    }

    if (spec.documentation.installDoc) {
      const installDoc = `# Guide d'Installation & Déploiement Local — ${spec.project.name}

## 1. Prérequis Système
${spec.backend.enabled && spec.backend.language === 'rust' ? '- **Rust & Cargo** : Toolchain stable 1.75+ recommandée (`rustup default stable`).' : ''}
${spec.backend.enabled && spec.backend.language === 'python' ? '- **Python** : Version 3.11+ avec `pip`.' : ''}
${spec.frontend.enabled ? '- **Node.js** : Version 18+ ou 20+ avec `npm`.' : ''}
${spec.database.enabled && spec.database.type === 'sqlite' ? '- **SQLite** : Moteur SQLite3 local (ou fichier `data.db` géré automatiquement).' : ''}
${spec.database.enabled && spec.database.type === 'postgresql' ? '- **PostgreSQL** : Instance PostgreSQL 15+ accessible.' : ''}

## 2. Configuration de l'Environnement
Créez un fichier \`.env\` à la racine du projet ou définissez la variable d'environnement \`PORT\` :
\`\`\`bash
# Port d'écoute du serveur backend (par défaut ${spec.backend.port})
PORT=${spec.backend.port}
${spec.database.enabled && spec.database.type === 'sqlite' ? 'DATABASE_URL="sqlite://data.db"' : ''}
\`\`\`

## 3. Lancement du Backend
\`\`\`bash
${spec.backend.language === 'rust' ? '# Compilation et exécution du serveur Axum\ncargo run' : '# Lancement du serveur Python\npython main.py'}
\`\`\`
Le serveur démarre et écoute sur \`http://localhost:${spec.backend.port}\`.

${spec.frontend.enabled ? `## 4. Lancement du Frontend
\`\`\`bash
# Installation des dépendances et démarrage du serveur de développement Vite
npm install
npm run dev
\`\`\`
` : ''}${spec.quality.tests ? `## 5. Exécution des Tests
\`\`\`bash
${spec.backend.language === 'rust' ? 'cargo test' : 'pytest'}
\`\`\`
` : ''}`;
      files.push(
        makeFile(
          'docs/INSTALL.md',
          installDoc,
          'markdown',
          'docs-pack',
          'Architecture & Developer Documentation',
          '1.2.0',
          'Guide pas à pas d\'installation des dépendances et de lancement local.'
        )
      );
    }

    if (spec.documentation.decisionsLog) {
      const adrs = `# Registre des Décisions Architecturales (ADR)

${decisions
  .map(
    (d) => `### ${d.id} : ${d.title}
* **Statut :** \`${d.status}\`
* **Contexte :** ${d.context}
* **Décision :** ${d.decision}
* **Brique génératrice :** \`${d.generatingBrick}\`
* **Conséquences :**
${d.consequences.map((c) => `  - ${c}`).join('\n')}
`
  )
  .join('\n---\n\n')}
`;
      files.push(
        makeFile(
          'docs/DECISIONS.md',
          adrs,
          'markdown',
          'docs-pack',
          'Architecture & Developer Documentation',
          '1.2.0',
          'Journal d\'audit des décisions architecturales déduites par le moteur.'
        )
      );
    }

    return files;
  },
};

export const DEFAULT_BRICKS: BrickDefinition[] = [
  rustBackendBrick,
  pythonBackendBrick,
  reactViteBrick,
  tauriDesktopBrick,
  sqliteStorageBrick,
  postgresStorageBrick,
  restApiBrick,
  dockerInfraBrick,
  qualitySuiteBrick,
  docsPackBrick,
];
