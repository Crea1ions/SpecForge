import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 5. SQLite Storage Brick
export const sqliteStorageBrick: BrickDefinition = {
  id: 'sqlite-storage',
  name: 'SQLite Local Database',
  category: 'database',
  version: '1.0.0',
  description: 'Base relationnelle embarquée sans serveur, idéale pour desktop et microservices autonomes.',
  iconName: 'Database',
  provides: ['sql_storage', 'embedded_persistence'],
  requires: ['backend_runtime'],
  applies: [{ database: { enabled: true, type: 'sqlite' } }],
  links: [
    { from: [{ category: 'backend' }], label: 'Connection Pool', protocol: 'Direct File I/O' },
  ],
  conflictsWith: ['postgres-storage'],
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
      const dbPath = isTauriDesktop
       ? 'src-tauri/src/db.rs'
       : 'src/db.rs';

       const migrationPath = isTauriDesktop
        ? 'src-tauri/migrations/0001_initial.sql'
        : 'migrations/0001_initial.sql';
       const migrationDir = './migrations';
      const dbRs = `//! Initialisation SQLite avec SQLx
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
};
use std::str::FromStr;

pub async fn init_database(
    database_url: &str,
) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let db_url = database_url;
    let options = SqliteConnectOptions::from_str(db_url)?
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
