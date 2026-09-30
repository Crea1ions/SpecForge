import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 8. REST API Brick
export const restApiBrick: BrickDefinition = {
  id: 'rest-api',
  name: 'RESTful API Engine',
  category: 'api',
  version: '1.3.0',
  description: 'Contrats d\'API REST avec sérialisation JSON, endpoints CRUD et tests de vivacité.',
  iconName: 'Network',
  provides: ['rest_server', 'json_serialization', 'health_probes'],
  requires: ['backend_runtime'],
  applies: [{ api: { style: 'rest' } }],
  links: [
    { from: ['rust-web-app'], label: 'HTTP API', protocol: 'HTTP/JSON' },
    { from: [{ category: 'backend' }], label: 'API', protocol: 'HTTP/JSON' },
    { from: ['react-vite'], label: 'Fetch API', protocol: 'HTTP/JSON' },
  ],
  conflictsWith: [],
  options: [],
  templateFiles: ['src/api.rs'],
  tags: ['rest', 'json', 'crud'],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];
    if (ctx.spec.backend.language === 'rust') {
      const isSqlite =
  ctx.spec.database.enabled &&
  ctx.spec.database.type === 'sqlite';

const isPostgres =
  ctx.spec.database.enabled &&
  ctx.spec.database.type === 'postgresql';

const apiRs = isSqlite
  ? `//! Contrôleurs REST connectés à SQLite via SQLx
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json,
    Router,
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
        service: "${ctx.spec.project.slug}",
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
    let items = sqlx::query_as::<_, Item>(
        "SELECT id, title, completed FROM items ORDER BY id ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(items))
}

pub async fn create_item(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateItemRequest>,
) -> Result<(StatusCode, Json<Item>), StatusCode> {
    let result = sqlx::query(
        "INSERT INTO items (title, completed) VALUES (?, 0)"
    )
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

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/api/health", get(health_check))
        .route("/api/items", get(list_items).post(create_item))
}
`
  : isPostgres
    ? `//! Contrôleurs REST connectés à PostgreSQL via SQLx
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json,
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
}

pub async fn health_check() -> impl IntoResponse {
    Json(HealthResponse {
        status: "healthy",
        service: "${ctx.spec.project.slug}",
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
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Item>>, StatusCode> {
    let items = sqlx::query_as::<_, Item>(
        "SELECT id, title, completed FROM items ORDER BY id ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(items))
}

pub async fn create_item(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateItemRequest>,
) -> Result<(StatusCode, Json<Item>), StatusCode> {
    let item = sqlx::query_as::<_, Item>(
        "INSERT INTO items (title, completed)
         VALUES ($1, FALSE)
         RETURNING id, title, completed"
    )
    .bind(&payload.title)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(item)))
}

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/health", get(health_check))
        .route("/api/items", get(list_items).post(create_item))
}
`
    : `//! Contrôleurs REST
use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json,
    Router,
};
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
        service: "${ctx.spec.project.slug}",
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
        Item {
            id: 1,
            title: "Spécification validée".to_string(),
            completed: true,
        },
        Item {
            id: 2,
            title: "Moteur déterministe".to_string(),
            completed: true,
        },
    ];

    Json(items)
}

pub async fn create_item(
    Json(payload): Json<CreateItemRequest>,
) -> impl IntoResponse {
    let item = Item {
        id: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
        title: payload.title,
        completed: false,
    };

    (StatusCode::CREATED, Json(item))
}

pub fn router() -> Router {
    Router::new()
        .route("/api/health", get(health_check))
        .route("/api/items", get(list_items).post(create_item))
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
