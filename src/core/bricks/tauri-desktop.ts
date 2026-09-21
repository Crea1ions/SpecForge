import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile, makeBinaryFile } from './helpers';
import { TAURI_ICON_BASE64 } from '../assets/tauri-icon';

// 4. Tauri Desktop Brick
export const tauriDesktopBrick: BrickDefinition = {
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
templateFiles: [
  'src-tauri/Cargo.toml',
  'src-tauri/build.rs',
  'src-tauri/tauri.conf.json',
  'src-tauri/src/main.rs',
  'src-tauri/icons/icon.png',
],
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

  const buildRs = `fn main() {
    tauri_build::build();
}
`;

  files.push(
    makeFile(
      'src-tauri/build.rs',
      buildRs,
      'rust',
      'tauri-desktop',
      'Tauri Desktop Wrapper',
      '1.4.2',
      'Script de build requis par Tauri.'
    )
  );

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
},
"bundle": {
  "icon": []
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

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

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
    let db_pool = db::init_database("sqlite:data.db").await?;

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

    files.push(
      makeBinaryFile(
        'src-tauri/icons/icon.png',
        TAURI_ICON_BASE64,
        'tauri-desktop',
        'Tauri Desktop Wrapper',
        '1.4.2',
        'Icône PNG RGBA par défaut, requise par tauri::generate_context!().'
      )
    );

    return files;
  },
};
