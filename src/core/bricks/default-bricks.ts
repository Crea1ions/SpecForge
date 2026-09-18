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

// 7. JWT Authentication Brick
const jwtAuthBrick: BrickDefinition = {
  id: 'jwt-auth',
  name: 'JWT Authentication',
  category: 'authentication',
  version: '1.0.0',
  description: 'Authentification stateless basée sur des JSON Web Tokens (JWT).',
  iconName: 'ShieldCheck',
  provides: ['jwt_authentication', 'token_authentication'],
  requires: ['backend_runtime'],
  compatibleWith: ['rust-backend', 'python-backend', 'rest-api', 'react-vite'],
  conflictsWith: [],
  options: [],
  templateFiles: ['src/auth.rs'],
  tags: ['auth', 'jwt', 'security', 'token'],

  generateDecisions: () => [
    {
      id: 'ADR-JWT-001',
      title: 'Authentification par JSON Web Token',
      status: 'Accepted',
      context:
        'Le projet nécessite un mécanisme d’authentification permettant de sécuriser les accès à l’application et à son API.',
      decision:
        'Adoption de JSON Web Tokens (JWT) comme mécanisme d’authentification stateless.',
      consequences: [
        'Les informations d’authentification sont portées par un token signé.',
        'Le backend n’a pas besoin de maintenir une session serveur pour chaque client authentifié.',
        'La gestion et la protection de la clé de signature deviennent une responsabilité de configuration du backend.',
      ],
      generatingBrick: 'jwt-auth',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];

    if (ctx.spec.backend.language === 'rust') {
      const authRs = `//! Authentification JWT
//!
//! Point d'intégration de l'authentification par JSON Web Token.
//! Les détails de configuration et les handlers pourront être complétés
//! par le générateur lorsque les options d'authentification seront définies.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}
`;

      files.push(
        makeFile(
          'src/auth.rs',
          authRs,
          'rust',
          'jwt-auth',
          'JWT Authentication',
          '1.0.0',
          'Modèle de claims et point d’intégration de l’authentification JWT.'
        )
      );
    }

    return files;
  },
};

// 8. REST API Brick
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

// 9. OpenAPI Brick
const openapiBrick: BrickDefinition = {
  id: 'openapi',
  name: 'OpenAPI Contract',
  category: 'api',
  version: '1.0.0',
  description: 'Contrat et documentation d’API au format OpenAPI.',
  iconName: 'FileJson',
  provides: ['openapi_contract', 'api_documentation'],
  requires: ['rest_server'],
  compatibleWith: ['rust-backend', 'python-backend', 'rest-api', 'react-vite'],
  conflictsWith: [],
  options: [],
  templateFiles: ['openapi.yaml'],
  tags: ['openapi', 'api', 'documentation', 'swagger'],

  generateDecisions: () => [
    {
      id: 'ADR-OPENAPI-001',
      title: 'Contrat d’API avec OpenAPI',
      status: 'Accepted',
      context:
        'Le projet expose une API et nécessite un contrat formel permettant de décrire ses endpoints, ses paramètres et ses schémas de données.',
      decision:
        'Adoption du standard OpenAPI pour décrire et documenter le contrat de l’API.',
      consequences: [
        'Le contrat de l’API est versionné avec le projet.',
        'La documentation des endpoints peut être générée ou consommée par des outils compatibles OpenAPI.',
        'Les évolutions du contrat d’API deviennent explicites et vérifiables.',
      ],
      generatingBrick: 'openapi',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];

    if (ctx.spec.api.style === 'rest') {
      const openapiYaml = `openapi: 3.0.3
info:
  title: ${ctx.spec.project.name}
  version: ${ctx.spec.project.version}
  description: ${ctx.spec.project.description}

servers:
  - url: http://localhost:${ctx.spec.backend.port}

paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service disponible

  /items:
    get:
      summary: Liste des items
      responses:
        '200':
          description: Liste des items

    post:
      summary: Créer un item
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateItemRequest'
      responses:
        '201':
          description: Item créé

components:
  schemas:
    Item:
      type: object
      properties:
        id:
          type: integer
          format: int64
        title:
          type: string
        completed:
          type: boolean
      required:
        - id
        - title
        - completed

    CreateItemRequest:
      type: object
      properties:
        title:
          type: string
      required:
        - title
`;

      files.push(
        makeFile(
          'openapi.yaml',
          openapiYaml,
          'yaml',
          'openapi',
          'OpenAPI Contract',
          '1.0.0',
          'Contrat OpenAPI décrivant les endpoints REST et leurs schémas.'
        )
      );
    }

    return files;
  },
};

// 10. Systemd Infrastructure Brick
const systemdInfraBrick: BrickDefinition = {
  id: 'systemd-infra',
  name: 'Systemd Service',
  category: 'infrastructure',
  version: '1.0.0',
  description: 'Configuration d’un service Linux systemd pour exécuter le backend.',
  iconName: 'ServerCog',
  provides: ['systemd_service', 'linux_service'],
  requires: ['backend_runtime'],
  compatibleWith: ['rust-backend', 'python-backend'],
  conflictsWith: [],
  options: [],
  templateFiles: ['deploy/systemd/app.service'],
  tags: ['systemd', 'linux', 'service', 'deployment'],

  generateDecisions: () => [
    {
      id: 'ADR-SYSTEMD-001',
      title: 'Déploiement du backend avec systemd',
      status: 'Accepted',
      context:
        'Le projet nécessite un mécanisme natif Linux permettant d’exécuter et de superviser le backend comme un service système.',
      decision:
        'Utilisation de systemd pour gérer le cycle de vie du service backend.',
      consequences: [
        'Le backend peut être démarré, arrêté et redémarré comme un service système.',
        'Le service bénéficie des mécanismes de supervision et de journalisation de systemd.',
        'La configuration du service dépend de l’environnement Linux cible.',
      ],
      generatingBrick: 'systemd-infra',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];

    if (ctx.spec.backend.enabled) {
      const serviceFile = `[Unit]
Description=${ctx.spec.project.name} backend service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/${ctx.spec.project.name}
ExecStart=/opt/${ctx.spec.project.name}/${ctx.spec.project.name}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

      files.push(
        makeFile(
          'deploy/systemd/app.service',
          serviceFile,
          'bash',
          'systemd-infra',
          'Systemd Service',
          '1.0.0',
          'Service systemd pour l’exécution du backend.'
        )
      );
    }

    return files;
  },
};

// 11. Docker Infrastructure Brick
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

// 12. Quality Suite Brick
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
data/*.db
data/*.db-shm
data/*.db-wal
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

// 13. Documentation Pack Brick
const docsPackBrick: BrickDefinition = {
  id: 'docs-pack',
  name: 'Project README',
  category: 'documentation',
  version: '1.3.0',
  description: 'README minimal contenant les informations directement disponibles sur le projet.',
  iconName: 'BookOpen',
  provides: ['dev_documentation'],
  requires: [],
  compatibleWith: [],
  conflictsWith: [],
  options: [],
  templateFiles: ['README.md'],
  tags: ['docs', 'readme'],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    if (spec.documentation.readme) {
      const readme = `# ${spec.project.name}

> ${spec.project.description}

## Informations du projet

- **Version :** \`${spec.project.version}\`
- **Profil technique :** \`${spec.profile}\`
- **Type d'application :** \`${spec.template}\`
- **Auteur :** ${spec.project.author}
- **Licence :** \`${spec.project.license}\`

La documentation technique de référence du projet se trouve dans
\`project.yaml\`.

Une représentation lisible de cette spécification est disponible dans
\`project.md\`.
`;

      files.push(
        makeFile(
          'README.md',
          readme,
          'markdown',
          'docs-pack',
          'Project README',
          '1.3.0',
          'README minimal contenant les informations directement disponibles sur le projet.'
        )
      );
    }

    return files;
  },
};

// 14. Project Work Structure Brick
const workStructureBrick: BrickDefinition = {
  id: 'work-structure',
  name: 'Project Work Structure',
  category: 'documentation',
  version: '1.0.0',
  description: 'Squelette documentaire de suivi de projet, avec des fichiers guides prêts à être complétés par le développeur.',
  iconName: 'FolderTree',
  provides: ['project_work_structure'],
  requires: [],
  compatibleWith: [],
  conflictsWith: [],
  options: [],
  templateFiles: [
    'work/00-README.md',
    'work/01-VISION/Fiche-Produit.md',
    'work/01-VISION/Principes.md',
    'work/01-VISION/Vision.md',
    'work/02-ROADMAP/Roadmap.md',
    'work/03-ARCHITECTURE/Architecture.md',
    'work/03-ARCHITECTURE/Backend.md',
    'work/03-ARCHITECTURE/Frontend.md',
    'work/03-ARCHITECTURE/Securite.md',
    'work/04-ISSUES/Decisions.md',
    'work/04-ISSUES/Issues.md',
    'work/04-ISSUES/Issues-Recurrentes.md',
    'work/04-ISSUES/Points-En-Suspens.md',
    'work/05-SESSIONS/Suivi-Sessions.md',
    'work/05-SESSIONS/TODOs.md',
    'work/06-TESTS/Tests-Manuels.md',
    'work/06-TESTS/Tests-Techniques.md',
    'work/09-NOTES-PREP/README.md',
    'work/CHANGELOG.md',
  ],
  tags: ['docs', 'work', 'project-management'],

  generateFiles: () => {
    const files: GeneratedFile[] = [];

    const documents: Array<[string, string]> = [
      [
        'work/00-README.md',
        `# Work

## Rôle du dossier

Ce dossier peut servir à organiser le suivi documentaire du projet.

Il propose une structure de travail destinée à être adaptée et complétée
par le développeur au fil de l'évolution du projet.
`,
      ],
      [
        'work/01-VISION/Fiche-Produit.md',
        `# Fiche Produit

## Rôle du document

Ce document peut servir à présenter le produit de manière synthétique :
son objectif, son public cible, ses fonctionnalités principales et son périmètre.
`,
      ],
      [
        'work/01-VISION/Principes.md',
        `# Principes

## Rôle du document

Ce document peut servir à formaliser les principes directeurs du projet :
règles de conception, contraintes importantes et choix fondamentaux.
`,
      ],
      [
        'work/01-VISION/Vision.md',
        `# Vision

## Rôle du document

Ce document peut servir à décrire la vision globale du projet,
sa finalité, ses objectifs et sa direction à long terme.
`,
      ],
      [
        'work/02-ROADMAP/Roadmap.md',
        `# Roadmap

## Rôle du document

Ce document peut servir à suivre les grandes étapes prévues du projet,
les évolutions envisagées et leur progression.
`,
      ],
      [
        'work/03-ARCHITECTURE/Architecture.md',
        `# Architecture

## Rôle du document

Ce document peut servir à décrire l'architecture générale du projet,
ses principaux composants et leurs relations.
`,
      ],
      [
        'work/03-ARCHITECTURE/Backend.md',
        `# Backend

## Rôle du document

Ce document peut servir à documenter l'organisation du backend,
ses composants, ses responsabilités et ses choix techniques spécifiques.
`,
      ],
      [
        'work/03-ARCHITECTURE/Frontend.md',
        `# Frontend

## Rôle du document

Ce document peut servir à documenter l'organisation du frontend,
ses composants, ses responsabilités et ses choix techniques spécifiques.
`,
      ],
      [
        'work/03-ARCHITECTURE/Securite.md',
        `# Sécurité

## Rôle du document

Ce document peut servir à centraliser les principes, contraintes,
mesures et décisions relatives à la sécurité du projet.
`,
      ],
      [
        'work/04-ISSUES/Decisions.md',
        `# Decisions

## Rôle du document

Ce document peut servir à conserver les décisions importantes prises
pendant le développement ainsi que leur contexte et leurs conséquences.
`,
      ],
      [
        'work/04-ISSUES/Issues.md',
        `# Issues

## Rôle du document

Ce document peut servir à suivre les problèmes, anomalies ou difficultés
identifiés pendant le développement et leur état de résolution.
`,
      ],
      [
        'work/04-ISSUES/Issues-Recurrentes.md',
        `# Issues Récurrentes

## Rôle du document

Ce document peut servir à suivre les problèmes qui apparaissent
régulièrement et à documenter leurs causes ou solutions connues.
`,
      ],
      [
        'work/04-ISSUES/Points-En-Suspens.md',
        `# Points En Suspens

## Rôle du document

Ce document peut servir à conserver les questions ouvertes,
incertitudes et sujets nécessitant encore une décision.
`,
      ],
      [
        'work/05-SESSIONS/Suivi-Sessions.md',
        `# Suivi des Sessions

## Rôle du document

Ce document peut servir à suivre les différentes sessions de développement,
leur état, leurs objectifs et leurs résultats.
`,
      ],
      [
        'work/05-SESSIONS/TODOs.md',
        `# TODOs

## Rôle du document

Ce document peut servir à centraliser les tâches restantes,
actions à effectuer et éléments à traiter ultérieurement.
`,
      ],
      [
        'work/06-TESTS/Tests-Manuels.md',
        `# Tests Manuels

## Rôle du document

Ce document peut servir à décrire les scénarios de test effectués manuellement,
leurs résultats et les éventuels problèmes constatés.
`,
      ],
      [
        'work/06-TESTS/Tests-Techniques.md',
        `# Tests Techniques

## Rôle du document

Ce document peut servir à documenter les tests techniques,
leur couverture, leurs résultats et les problèmes détectés.
`,
      ],
      [
        'work/09-NOTES-PREP/README.md',
        `# Notes de Préparation

## Rôle du dossier

Ce dossier peut servir à conserver les notes, réflexions et préparations
temporaires qui ne sont pas encore intégrées à la documentation principale.
`,
      ],
      [
        'work/CHANGELOG.md',
        `# Changelog

## Rôle du document

Ce document peut servir à conserver l'historique des évolutions
significatives du projet.
`,
      ],
    ];

    for (const [path, content] of documents) {
      files.push(
        makeFile(
          path,
          content,
          'markdown',
          'work-structure',
          'Project Work Structure',
          '1.0.0',
          'Squelette documentaire proposé par SpecForge.'
        )
      );
    }

    return files;
  },
};

// 15. Project RUST Web Frontend Brick
const rustWebFrontendBrick: BrickDefinition = {
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

// 16. Rust Web App Brick
const rustWebAppBrick: BrickDefinition = {
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
mod db;
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

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/", get(handlers::index))
        .route("/dashboard", get(handlers::dashboard))
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

export const DEFAULT_BRICKS: BrickDefinition[] = [
  rustBackendBrick,
  rustWebFrontendBrick,
  rustWebAppBrick,
  pythonBackendBrick,
  reactViteBrick,
  tauriDesktopBrick,
  sqliteStorageBrick,
  postgresStorageBrick,
  jwtAuthBrick,
  restApiBrick,
  openapiBrick,
  systemdInfraBrick,
  dockerInfraBrick,
  qualitySuiteBrick,
  docsPackBrick,
  workStructureBrick,
];