import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 6. PostgreSQL Storage Brick
export const postgresStorageBrick: BrickDefinition = {
  id: 'postgres-storage',
  name: 'PostgreSQL Enterprise Storage',
  category: 'database',
  version: '1.2.1',
  description: 'Moteur de base relationnelle puissant pour charges intensives et architectures distribuées.',
  iconName: 'Layers',
  provides: ['sql_storage', 'distributed_persistence', 'acid_transactions'],
  requires: ['backend_runtime'],
  applies: [{ database: { enabled: true, type: 'postgresql' } }],
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

pub async fn init_database(
    database_url: &str,
) -> Result<PgPool, Box<dyn std::error::Error>> {
    let db_url = database_url;
    ${
      ctx.spec.database.pooling
        ? `// Pooling activé : gestion dynamique d'un pool de 10 connexions
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(db_url)
        .await?;`
        : `// Mode sans pooling : connexion dédiée stricte (max_connections = 1, pas de pool dynamique)
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(db_url)
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
