import { GenerationContext, GeneratedFile } from '../types';

const API_SOURCE = (service: string, version: string): string => `//! REST API for the SpecForge e-commerce template.
//! Mock payments are local and deterministic; this module never contacts a PSP.

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use crate::ecommerce::accounts::AdminRole;
use crate::ecommerce::payment::{
    MockPaymentProvider, MockScenario, PaymentOutcome, PaymentProvider,
};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, patch, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sqlx::{FromRow, PgPool, Postgres, Transaction};
use sqlx::types::Json as SqlJson;
use std::{
    env,
    fmt::Write as FmtWrite,
    time::{SystemTime, UNIX_EPOCH},
};

const SERVICE_NAME: &str = ${JSON.stringify(service)};
const SERVICE_VERSION: &str = ${JSON.stringify(version)};
const MAX_PAGE_SIZE: i64 = 100;
const MAX_CART_QUANTITY: i32 = 10_000;

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
}

struct ApiError {
    status: StatusCode,
    message: &'static str,
}

impl ApiError {
    fn new(status: StatusCode, message: &'static str) -> Self {
        Self { status, message }
    }

    fn internal() -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, "An internal error occurred")
    }

    fn unauthorized() -> Self {
        Self::new(StatusCode::UNAUTHORIZED, "Authentication is required")
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        (self.status, Json(ErrorBody { error: self.message })).into_response()
    }
}

type ApiResult<T> = Result<T, ApiError>;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
}

async fn health(State(pool): State<PgPool>) -> ApiResult<Json<HealthResponse>> {
    let _: i32 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|_| ApiError::internal())?;
    Ok(Json(HealthResponse {
        status: "healthy",
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
    }))
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
}

fn jwt_secret() -> ApiResult<Vec<u8>> {
    let configured = env::var("JWT_SECRET").map_err(|_| {
        ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "JWT signing is not configured",
        )
    })?;
    let secret = configured.trim();
    let normalized = secret.to_ascii_lowercase();
    let known_placeholder = normalized == "replace-with-a-random-secret-of-at-least-32-bytes"
        || normalized == "changeme"
        || normalized == "change-me"
        || normalized == "your-secret"
        || normalized == "your-secret-here"
        || normalized == "placeholder"
        || normalized.contains("replace-with")
        || normalized.contains("placeholder");
    if secret.as_bytes().len() < 32 || known_placeholder {
        return Err(ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "JWT signing is not configured",
        ));
    }
    Ok(secret.as_bytes().to_vec())
}

fn issue_token(subject: i64, role: &str, secret: &[u8]) -> ApiResult<String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| ApiError::internal())?
        .as_secs();
    let expiration = now.checked_add(24 * 60 * 60).ok_or_else(ApiError::internal)?;
    let exp = usize::try_from(expiration).map_err(|_| ApiError::internal())?;
    let claims = Claims {
        sub: subject.to_string(),
        role: role.to_owned(),
        exp,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret),
    )
    .map_err(|_| ApiError::internal())
}

fn claims_from_headers(headers: &HeaderMap) -> ApiResult<Claims> {
    let authorization = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(ApiError::unauthorized)?;
    let token = authorization
        .strip_prefix("Bearer ")
        .filter(|value| !value.is_empty())
        .ok_or_else(ApiError::unauthorized)?;
    let secret = jwt_secret()?;
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(&secret),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| ApiError::unauthorized())
}

async fn customer_id(headers: &HeaderMap, pool: &PgPool) -> ApiResult<i64> {
    let claims = claims_from_headers(headers)?;
    if claims.role != "customer" {
        return Err(ApiError::new(StatusCode::FORBIDDEN, "Customer access is required"));
    }
    let id = claims
        .sub
        .parse::<i64>()
        .map_err(|_| ApiError::unauthorized())?;
    let active: Option<bool> = sqlx::query_scalar(
        "SELECT is_active FROM customers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|_| ApiError::internal())?;
    if active != Some(true) {
        return Err(ApiError::unauthorized());
    }
    Ok(id)
}

async fn admin_id(
    headers: &HeaderMap,
    pool: &PgPool,
    allowed_roles: &[&str],
) -> ApiResult<(i64, String)> {
    let claims = claims_from_headers(headers)?;
    if !allowed_roles.contains(&claims.role.as_str()) {
        return Err(ApiError::new(StatusCode::FORBIDDEN, "This administrator role is not allowed"));
    }
    let id = claims
        .sub
        .parse::<i64>()
        .map_err(|_| ApiError::unauthorized())?;
    let current: Option<(String, bool)> =
        sqlx::query_as("SELECT role, is_active FROM admin_users WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(|_| ApiError::internal())?;
    match current {
        Some((role, true)) if role == claims.role && allowed_roles.contains(&role.as_str()) => {
            Ok((id, role))
        }
        Some((_, false)) | None => Err(ApiError::unauthorized()),
        _ => Err(ApiError::new(
            StatusCode::FORBIDDEN,
            "This administrator role is not allowed",
        )),
    }
}

fn validate_email(input: &str) -> ApiResult<String> {
    let email = input.trim().to_lowercase();
    if email.len() > 254
        || !email.contains('@')
        || email.starts_with('@')
        || email.ends_with('@')
        || email.chars().any(char::is_whitespace)
    {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "A valid email is required"));
    }
    Ok(email)
}

fn password_hash(password: &str) -> ApiResult<String> {
    let password_length = password.chars().count();
    if password_length < 8 || password_length > 256 {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Password must contain 8 to 256 characters",
        ));
    }
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| ApiError::internal())
}

#[derive(Debug, FromRow)]
struct CustomerRecord {
    id: i64,
    email: String,
    password_hash: String,
    full_name: String,
    is_active: bool,
}

#[derive(Debug, FromRow)]
struct AdminRecord {
    id: i64,
    email: String,
    password_hash: String,
    role: String,
    is_active: bool,
}

#[derive(Deserialize)]
struct RegisterRequest {
    email: String,
    password: String,
    full_name: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    phone: Option<String>,
    locale: Option<String>,
}

#[derive(Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct PrincipalResponse {
    id: i64,
    email: String,
    full_name: Option<String>,
    role: String,
}

#[derive(Serialize)]
struct AuthResponse {
    access_token: String,
    token_type: &'static str,
    expires_in: u64,
    principal: PrincipalResponse,
}

fn auth_response(
    token: String,
    id: i64,
    email: String,
    full_name: Option<String>,
    role: String,
) -> AuthResponse {
    AuthResponse {
        access_token: token,
        token_type: "Bearer",
        expires_in: 24 * 60 * 60,
        principal: PrincipalResponse {
            id,
            email,
            full_name,
            role,
        },
    }
}

async fn register(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<RegisterRequest>,
) -> ApiResult<(StatusCode, Json<AuthResponse>)> {
    let secret = jwt_secret()?;
    let email = validate_email(&payload.email)?;
    let full_name = payload
        .full_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| {
            let first_name = payload.first_name.as_deref().unwrap_or("").trim();
            let last_name = payload.last_name.as_deref().unwrap_or("").trim();
            let full_name = format!("{first_name} {last_name}").trim().to_owned();
            if full_name.is_empty() { None } else { Some(full_name) }
        })
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "A valid full name is required"))?;
    if full_name.chars().count() > 200 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "A valid full name is required"));
    }
    if payload
        .phone
        .as_ref()
        .is_some_and(|phone| phone.chars().count() > 80)
    {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Phone number is too long"));
    }
    let locale = payload
        .locale
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("fr");
    if locale.len() > 20 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Locale is too long"));
    }
    let hashed_password = password_hash(&payload.password)?;
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let record = match sqlx::query_as::<_, CustomerRecord>(
        "INSERT INTO customers (email, password_hash, full_name, phone, locale)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, password_hash, full_name, is_active",
    )
    .bind(&email)
    .bind(&hashed_password)
    .bind(&full_name)
    .bind(payload.phone.as_deref())
    .bind(locale)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(record) => record,
        Err(error) => {
            if let Some(database_error) = error.as_database_error() {
                if database_error.code().as_deref() == Some("23505") {
                    return Err(ApiError::new(StatusCode::CONFLICT, "An account already uses this email"));
                }
            }
            return Err(ApiError::internal());
        }
    };
    if !record.is_active {
        return Err(ApiError::internal());
    }
    if let Some(session) = optional_cart_session(&headers)? {
        attach_session_cart(&mut tx, &session, record.id).await?;
    }
    sqlx::query(
        "INSERT INTO notifications (template_key, recipient_email, channel, status)
         VALUES ('account_created', $1, 'email', 'pending')",
    )
    .bind(&record.email)
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let token = issue_token(record.id, "customer", &secret)?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    let response = auth_response(
        token,
        record.id,
        record.email,
        Some(record.full_name),
        "customer".to_owned(),
    );
    Ok((StatusCode::CREATED, Json(response)))
}

async fn customer_login(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<LoginRequest>,
) -> ApiResult<Json<AuthResponse>> {
    let secret = jwt_secret()?;
    let email = validate_email(&payload.email)?;
    let record: Option<CustomerRecord> = sqlx::query_as(
        "SELECT id, email, password_hash, full_name, is_active
         FROM customers WHERE lower(email) = $1",
    )
    .bind(&email)
    .fetch_optional(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    let record = record.filter(|record| record.is_active).ok_or_else(ApiError::unauthorized)?;
    let parsed_hash = PasswordHash::new(&record.password_hash).map_err(|_| ApiError::internal())?;
    if Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return Err(ApiError::unauthorized());
    }
    if let Some(session) = optional_cart_session(&headers)? {
        let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
        attach_session_cart(&mut tx, &session, record.id).await?;
        tx.commit().await.map_err(|_| ApiError::internal())?;
    }
    let token = issue_token(record.id, "customer", &secret)?;
    Ok(Json(auth_response(
        token,
        record.id,
        record.email,
        Some(record.full_name),
        "customer".to_owned(),
    )))
}

async fn admin_login(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> ApiResult<Json<AuthResponse>> {
    let secret = jwt_secret()?;
    let email = validate_email(&payload.email)?;
    let record: Option<AdminRecord> = sqlx::query_as(
        "SELECT id, email, password_hash, role, is_active
         FROM admin_users WHERE lower(email) = $1",
    )
    .bind(&email)
    .fetch_optional(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    let record = record.filter(|record| record.is_active).ok_or_else(ApiError::unauthorized)?;
    let parsed_hash = PasswordHash::new(&record.password_hash).map_err(|_| ApiError::internal())?;
    if Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return Err(ApiError::unauthorized());
    }
    let token = issue_token(record.id, &record.role, &secret)?;
    Ok(Json(auth_response(
        token,
        record.id,
        record.email,
        None,
        record.role,
    )))
}

#[derive(Deserialize)]
struct Pagination {
    limit: Option<i64>,
    offset: Option<i64>,
}

impl Pagination {
    fn values(&self) -> ApiResult<(i64, i64)> {
        let limit = self.limit.unwrap_or(25);
        let offset = self.offset.unwrap_or(0);
        if !(1..=MAX_PAGE_SIZE).contains(&limit) || offset < 0 {
            return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid pagination values"));
        }
        Ok((limit, offset))
    }
}

#[derive(Debug, FromRow)]
struct ProductRow {
    id: i64,
    sku: String,
    name: SqlJson<Value>,
    description_short: Option<SqlJson<Value>>,
    description_long: Option<SqlJson<Value>>,
    price_catalog: i64,
    currency: String,
    tax_rate_bp: i32,
    stock_tracked: bool,
    is_sellable: bool,
    available: Option<i32>,
    primary_image: Option<String>,
    images: SqlJson<Value>,
}

#[derive(Serialize)]
struct ProductResponse {
    id: i64,
    sku: String,
    name: Value,
    description_short: Option<Value>,
    description_long: Option<Value>,
    price_catalog: i64,
    currency: String,
    tax_rate_bp: i32,
    stock_tracked: bool,
    is_sellable: bool,
    available_quantity: Option<i32>,
    primary_image: Option<String>,
    images: Value,
}

impl From<ProductRow> for ProductResponse {
    fn from(row: ProductRow) -> Self {
        Self {
            id: row.id,
            sku: row.sku,
            name: row.name.0,
            description_short: row.description_short.map(|value| value.0),
            description_long: row.description_long.map(|value| value.0),
            price_catalog: row.price_catalog,
            currency: row.currency.trim().to_owned(),
            tax_rate_bp: row.tax_rate_bp,
            stock_tracked: row.stock_tracked,
            is_sellable: row.is_sellable,
            available_quantity: row.available,
            primary_image: row.primary_image,
            images: row.images.0,
        }
    }
}

const PUBLIC_PRODUCT_SELECT: &str =
    "SELECT p.id, p.sku, p.name, p.description_short, p.description_long,
            p.price_catalog, p.currency, t.rate_bp AS tax_rate_bp,
            p.stock_tracked, p.is_sellable,
            CASE WHEN p.stock_tracked THEN COALESCE(s.available, 0) ELSE NULL END AS available,
            (SELECT pi.url FROM product_images pi
             WHERE pi.product_id = p.id AND pi.is_primary = true
             ORDER BY pi.position ASC LIMIT 1) AS primary_image,
            COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object('url', pi.url, 'alt', pi.alt, 'is_primary', pi.is_primary)
                    ORDER BY pi.position
                 ) FROM product_images pi WHERE pi.product_id = p.id),
                '[]'::jsonb
            ) AS images
     FROM products p
     JOIN tax_rates t ON t.id = p.tax_rate_id
     LEFT JOIN stock_levels s ON s.product_id = p.id
     WHERE p.is_active = true AND p.is_sellable = true AND p.is_published = true";

#[derive(Deserialize)]
struct ProductQuery {
    limit: Option<i64>,
    offset: Option<i64>,
    search: Option<String>,
    category_id: Option<i64>,
    sort: Option<String>,
}

async fn public_products(
    State(pool): State<PgPool>,
    Query(query): Query<ProductQuery>,
) -> ApiResult<Json<Vec<ProductResponse>>> {
    let pagination = Pagination {
        limit: query.limit,
        offset: query.offset,
    };
    let (limit, offset) = pagination.values()?;
    if query.category_id.is_some_and(|id| id <= 0) {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid category id"));
    }
    let search = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if search.is_some_and(|value| value.chars().count() > 200) {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Search query is too long"));
    }
    let sort = query.sort.as_deref().unwrap_or("display_order");
    if !["display_order", "price_asc", "price_desc"].contains(&sort) {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Unsupported product sort order"));
    }
    let sql = format!(
        "{PUBLIC_PRODUCT_SELECT}
         AND ($1::text IS NULL OR p.sku ILIKE '%' || $1 || '%' OR p.name::text ILIKE '%' || $1 || '%')
         AND ($2::bigint IS NULL OR EXISTS (
             SELECT 1 FROM product_categories pc
             WHERE pc.product_id = p.id AND pc.category_id = $2
         ))
         ORDER BY
             CASE WHEN $3 = 'price_asc' THEN p.price_catalog END ASC NULLS LAST,
             CASE WHEN $3 = 'price_desc' THEN p.price_catalog END DESC NULLS LAST,
             CASE WHEN $3 = 'display_order' THEN p.display_order END ASC NULLS LAST,
             p.id
         LIMIT $4 OFFSET $5"
    );
    let rows = sqlx::query_as::<_, ProductRow>(&sql)
        .bind(search)
        .bind(query.category_id)
        .bind(sort)
        .bind(limit)
        .bind(offset)
        .fetch_all(&pool)
        .await
        .map_err(|_| ApiError::internal())?;
    Ok(Json(rows.into_iter().map(ProductResponse::from).collect()))
}

async fn public_product(
    State(pool): State<PgPool>,
    Path(product_id): Path<i64>,
) -> ApiResult<Json<ProductResponse>> {
    if product_id <= 0 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid product id"));
    }
    let sql = format!("{PUBLIC_PRODUCT_SELECT} AND p.id = $1");
    let row = sqlx::query_as::<_, ProductRow>(&sql)
        .bind(product_id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| ApiError::internal())?
        .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Product not found"))?;
    Ok(Json(ProductResponse::from(row)))
}

#[derive(Debug, FromRow)]
struct CategoryRow {
    id: i64,
    name: SqlJson<Value>,
    slug: String,
    path: String,
    position: i32,
}

#[derive(Serialize)]
struct CategoryResponse {
    id: i64,
    name: Value,
    slug: String,
    path: String,
    position: i32,
}

async fn public_categories(
    State(pool): State<PgPool>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<Vec<CategoryResponse>>> {
    let (limit, offset) = pagination.values()?;
    let rows = sqlx::query_as::<_, CategoryRow>(
        "SELECT DISTINCT c.id, c.name, c.slug, c.path, c.position
         FROM categories c
         JOIN product_categories pc ON pc.category_id = c.id
         JOIN products p ON p.id = pc.product_id
         WHERE p.is_active = true AND p.is_sellable = true AND p.is_published = true
         ORDER BY c.position, c.id
         LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    let categories = rows
        .into_iter()
        .map(|row| CategoryResponse {
            id: row.id,
            name: row.name.0,
            slug: row.slug,
            path: row.path,
            position: row.position,
        })
        .collect();
    Ok(Json(categories))
}

async fn configured_currency(
    executor: &mut Transaction<'_, Postgres>,
) -> ApiResult<String> {
    let value: Option<SqlJson<Value>> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'shop.currency'")
            .fetch_optional(&mut **executor)
            .await
            .map_err(|_| ApiError::internal())?;
    let currency = value
        .and_then(|json| json.0.as_str().map(str::to_owned))
        .ok_or_else(|| ApiError::new(StatusCode::SERVICE_UNAVAILABLE, "Shop currency is not configured"))?;
    if currency.len() != 3 || !currency.chars().all(|character| character.is_ascii_uppercase()) {
        return Err(ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "Shop currency is not configured",
        ));
    }
    Ok(currency)
}

async fn tax_display(pool: &PgPool) -> ApiResult<String> {
    let value: Option<SqlJson<Value>> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'shop.tax_display'")
            .fetch_optional(pool)
            .await
            .map_err(|_| ApiError::internal())?;
    let display = value
        .and_then(|json| json.0.as_str().map(str::to_owned))
        .ok_or_else(|| ApiError::new(StatusCode::SERVICE_UNAVAILABLE, "Shop tax display is not configured"))?;
    if display != "ht" && display != "ttc" {
        return Err(ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "Shop tax display is not configured",
        ));
    }
    Ok(display)
}

#[derive(Clone)]
enum CartOwner {
    Customer(i64),
    Session(String),
}

fn cart_session(headers: &HeaderMap) -> ApiResult<String> {
    let session = headers
        .get("x-cart-session")
        .and_then(|value| value.to_str().ok())
        .filter(|value| (32..=128).contains(&value.len()))
        .filter(|value| value.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_'))
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "A valid cart session is required"))?;
    Ok(session.to_owned())
}

fn optional_cart_session(headers: &HeaderMap) -> ApiResult<Option<String>> {
    if headers.contains_key("x-cart-session") {
        return cart_session(headers).map(Some);
    }
    Ok(None)
}

async fn cart_owner(headers: &HeaderMap, pool: &PgPool) -> ApiResult<CartOwner> {
    if headers.contains_key(axum::http::header::AUTHORIZATION) {
        return customer_id(headers, pool).await.map(CartOwner::Customer);
    }
    Ok(CartOwner::Session(cart_session(headers)?))
}

async fn attach_session_cart(
    tx: &mut Transaction<'_, Postgres>,
    session: &str,
    customer_id: i64,
) -> ApiResult<()> {
    let anonymous: Option<(i64, String)> = sqlx::query_as(
        "SELECT id, currency FROM carts
         WHERE session_token = $1 AND customer_id IS NULL AND status = 'open'
         FOR UPDATE",
    )
    .bind(session)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let Some((anonymous_id, anonymous_currency)) = anonymous else {
        return Ok(());
    };

    let customer_cart: Option<(i64, String)> = sqlx::query_as(
        "SELECT id, currency FROM carts
         WHERE customer_id = $1 AND status = 'open'
         FOR UPDATE",
    )
    .bind(customer_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?;

    let Some((customer_cart_id, customer_currency)) = customer_cart else {
        sqlx::query(
            "UPDATE carts
             SET customer_id = $2, session_token = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1",
        )
        .bind(anonymous_id)
        .bind(customer_id)
        .execute(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?;
        return Ok(());
    };

    if customer_currency.trim() != anonymous_currency.trim() {
        return Err(ApiError::new(StatusCode::CONFLICT, "Cart currencies do not match"));
    }

    let anonymous_lines: Vec<(i64, i32)> = sqlx::query_as(
        "SELECT product_id, quantity FROM cart_lines WHERE cart_id = $1 ORDER BY product_id",
    )
    .bind(anonymous_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?;
    for (product_id, quantity) in anonymous_lines {
        let product = current_product(tx, product_id).await?;
        let existing_quantity: Option<i32> = sqlx::query_scalar(
            "SELECT quantity FROM cart_lines WHERE cart_id = $1 AND product_id = $2",
        )
        .bind(customer_cart_id)
        .bind(product_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?;
        let merged_quantity = existing_quantity
            .unwrap_or(0)
            .checked_add(quantity)
            .filter(|value| *value <= MAX_CART_QUANTITY)
            .ok_or_else(|| ApiError::new(StatusCode::CONFLICT, "Merged cart quantity is too large"))?;
        check_stock(tx, &product, merged_quantity).await?;
        sqlx::query(
            "INSERT INTO cart_lines (cart_id, product_id, quantity, unit_price, currency, tax_rate_bp)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (cart_id, product_id) DO UPDATE
             SET quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price,
                 currency = EXCLUDED.currency, tax_rate_bp = EXCLUDED.tax_rate_bp",
        )
        .bind(customer_cart_id)
        .bind(product.id)
        .bind(merged_quantity)
        .bind(product.price_catalog)
        .bind(product.currency.trim())
        .bind(product.tax_rate_bp)
        .execute(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }
    sqlx::query("UPDATE carts SET status = 'converted' WHERE id = $1")
        .bind(anonymous_id)
        .execute(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?;
    Ok(())
}

async fn lock_open_cart(
    tx: &mut Transaction<'_, Postgres>,
    owner: &CartOwner,
    create_if_missing: bool,
) -> ApiResult<(i64, String)> {
    let existing: Option<(i64, String)> = match owner {
        CartOwner::Customer(customer_id) => sqlx::query_as(
            "SELECT id, currency FROM carts
             WHERE customer_id = $1 AND status = 'open'
             FOR UPDATE",
        )
        .bind(customer_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?,
        CartOwner::Session(session) => sqlx::query_as(
            "SELECT id, currency FROM carts
             WHERE session_token = $1 AND customer_id IS NULL AND status = 'open'
             FOR UPDATE",
        )
        .bind(session)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?,
    };
    if let Some((id, currency)) = existing {
        return Ok((id, currency.trim().to_owned()));
    }
    if !create_if_missing {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "Open cart not found"));
    }
    let currency = configured_currency(tx).await?;
    let inserted: Option<(i64, String)> = match owner {
        CartOwner::Customer(customer_id) => sqlx::query_as(
            "INSERT INTO carts (customer_id, status, currency)
             VALUES ($1, 'open', $2)
             ON CONFLICT DO NOTHING
             RETURNING id, currency",
        )
        .bind(customer_id)
        .bind(&currency)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?,
        CartOwner::Session(session) => sqlx::query_as(
            "INSERT INTO carts (session_token, status, currency)
             VALUES ($1, 'open', $2)
             ON CONFLICT DO NOTHING
             RETURNING id, currency",
        )
        .bind(session)
        .bind(&currency)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?,
    };
    if let Some((id, returned_currency)) = inserted {
        return Ok((id, returned_currency.trim().to_owned()));
    }
    let raced: Option<(i64, String)> = match owner {
        CartOwner::Customer(customer_id) => sqlx::query_as(
            "SELECT id, currency FROM carts
             WHERE customer_id = $1 AND status = 'open'
             FOR UPDATE",
        )
        .bind(customer_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?,
        CartOwner::Session(session) => sqlx::query_as(
            "SELECT id, currency FROM carts
             WHERE session_token = $1 AND customer_id IS NULL AND status = 'open'
             FOR UPDATE",
        )
        .bind(session)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| ApiError::internal())?,
    };
    raced
        .map(|(id, currency)| (id, currency.trim().to_owned()))
        .ok_or_else(ApiError::internal)
}

#[derive(Debug, FromRow)]
struct CartLineRow {
    product_id: i64,
    sku: String,
    name: SqlJson<Value>,
    quantity: i32,
    unit_price: i64,
    currency: String,
    tax_rate_bp: i32,
}

#[derive(Serialize)]
struct CartLineResponse {
    product_id: i64,
    sku: String,
    name: Value,
    quantity: i32,
    unit_price: i64,
    unit_price_incl_tax: i64,
    total_incl_tax: i64,
    currency: String,
    tax_rate_bp: i32,
}

#[derive(Serialize)]
struct CartResponse {
    id: i64,
    currency: String,
    total_incl_tax: i64,
    items: Vec<CartLineResponse>,
}

async fn load_cart(
    tx: &mut Transaction<'_, Postgres>,
    cart_id: i64,
    currency: String,
    display: &str,
) -> ApiResult<CartResponse> {
    let rows = sqlx::query_as::<_, CartLineRow>(
        "SELECT cl.product_id, p.sku, p.name, cl.quantity, cl.unit_price,
                cl.currency, cl.tax_rate_bp
         FROM cart_lines cl
         JOIN products p ON p.id = cl.product_id
         WHERE cl.cart_id = $1
         ORDER BY p.display_order, p.id",
    )
    .bind(cart_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let mut total_incl_tax = 0_i64;
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        let unit_money = calculate_money(row.unit_price, 1, row.tax_rate_bp, display)?;
        let line_money = calculate_money(row.unit_price, row.quantity, row.tax_rate_bp, display)?;
        total_incl_tax = total_incl_tax
            .checked_add(line_money.total_incl_tax)
            .ok_or_else(ApiError::internal)?;
        items.push(CartLineResponse {
            product_id: row.product_id,
            sku: row.sku,
            name: row.name.0,
            quantity: row.quantity,
            unit_price: row.unit_price,
            unit_price_incl_tax: unit_money.total_incl_tax,
            total_incl_tax: line_money.total_incl_tax,
            currency: row.currency.trim().to_owned(),
            tax_rate_bp: row.tax_rate_bp,
        });
    }
    Ok(CartResponse {
        id: cart_id,
        currency,
        total_incl_tax,
        items,
    })
}

async fn get_cart(
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> ApiResult<Json<CartResponse>> {
    let owner = cart_owner(&headers, &pool).await?;
    Ok(Json(current_cart(&pool, &owner).await?))
}

async fn current_cart(pool: &PgPool, owner: &CartOwner) -> ApiResult<CartResponse> {
    let display = tax_display(pool).await?;
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let (cart_id, currency) = lock_open_cart(&mut tx, owner, true).await?;
    let cart = load_cart(&mut tx, cart_id, currency, &display).await?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok(cart)
}

async fn create_cart(
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> ApiResult<Json<CartResponse>> {
    let owner = cart_owner(&headers, &pool).await?;
    Ok(Json(current_cart(&pool, &owner).await?))
}

async fn get_cart_items(
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<CartLineResponse>>> {
    let owner = cart_owner(&headers, &pool).await?;
    let cart = current_cart(&pool, &owner).await?;
    Ok(Json(cart.items))
}

#[derive(Debug, FromRow)]
struct CurrentProduct {
    id: i64,
    price_catalog: i64,
    currency: String,
    tax_rate_bp: i32,
    stock_tracked: bool,
    allow_out_of_stock: bool,
}

async fn current_product(
    tx: &mut Transaction<'_, Postgres>,
    product_id: i64,
) -> ApiResult<CurrentProduct> {
    sqlx::query_as::<_, CurrentProduct>(
        "SELECT p.id, p.price_catalog, p.currency, t.rate_bp AS tax_rate_bp,
                p.stock_tracked, p.allow_out_of_stock
         FROM products p
         JOIN tax_rates t ON t.id = p.tax_rate_id
         WHERE p.id = $1 AND p.is_active = true
           AND p.is_sellable = true AND p.is_published = true
         FOR UPDATE OF p",
    )
    .bind(product_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?
    .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Product not found"))
}

async fn check_stock(
    tx: &mut Transaction<'_, Postgres>,
    product: &CurrentProduct,
    quantity: i32,
) -> ApiResult<()> {
    if !product.stock_tracked || product.allow_out_of_stock {
        return Ok(());
    }
    let available: Option<i32> = sqlx::query_scalar(
        "SELECT available FROM stock_levels WHERE product_id = $1 FOR UPDATE",
    )
    .bind(product.id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?;
    if available.unwrap_or(0) < quantity {
        return Err(ApiError::new(StatusCode::CONFLICT, "Requested quantity is unavailable"));
    }
    Ok(())
}

#[derive(Deserialize)]
struct AddCartItemRequest {
    product_id: i64,
    quantity: i32,
}

async fn add_cart_item(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<AddCartItemRequest>,
) -> ApiResult<Json<CartResponse>> {
    let owner = cart_owner(&headers, &pool).await?;
    let display = tax_display(&pool).await?;
    if payload.product_id <= 0 || payload.quantity <= 0 || payload.quantity > MAX_CART_QUANTITY {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid product or quantity"));
    }
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let (cart_id, cart_currency) = lock_open_cart(&mut tx, &owner, true).await?;
    let product = current_product(&mut tx, payload.product_id).await?;
    if product.currency.trim() != cart_currency {
        return Err(ApiError::new(StatusCode::CONFLICT, "Product currency does not match the cart"));
    }
    let current_quantity: Option<i32> = sqlx::query_scalar(
        "SELECT quantity FROM cart_lines WHERE cart_id = $1 AND product_id = $2",
    )
    .bind(cart_id)
    .bind(product.id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let quantity = current_quantity
        .unwrap_or(0)
        .checked_add(payload.quantity)
        .filter(|value| *value <= MAX_CART_QUANTITY)
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Cart quantity is too large"))?;
    check_stock(&mut tx, &product, quantity).await?;
    sqlx::query(
        "INSERT INTO cart_lines (cart_id, product_id, quantity, unit_price, currency, tax_rate_bp)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (cart_id, product_id) DO UPDATE
         SET quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price,
             currency = EXCLUDED.currency, tax_rate_bp = EXCLUDED.tax_rate_bp",
    )
    .bind(cart_id)
    .bind(product.id)
    .bind(quantity)
    .bind(product.price_catalog)
    .bind(product.currency.trim())
    .bind(product.tax_rate_bp)
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let cart = load_cart(&mut tx, cart_id, cart_currency, &display).await?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok(Json(cart))
}

#[derive(Deserialize)]
struct UpdateCartItemRequest {
    quantity: i32,
}

async fn update_cart_item(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(product_id): Path<i64>,
    Json(payload): Json<UpdateCartItemRequest>,
) -> ApiResult<Json<CartResponse>> {
    let owner = cart_owner(&headers, &pool).await?;
    let display = tax_display(&pool).await?;
    if product_id <= 0 || payload.quantity < 0 || payload.quantity > MAX_CART_QUANTITY {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid product or quantity"));
    }
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let (cart_id, cart_currency) = lock_open_cart(&mut tx, &owner, false).await?;
    let exists: Option<i64> =
        sqlx::query_scalar("SELECT id FROM cart_lines WHERE cart_id = $1 AND product_id = $2")
            .bind(cart_id)
            .bind(product_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
    if exists.is_none() {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "Cart item not found"));
    }
    if payload.quantity == 0 {
        sqlx::query("DELETE FROM cart_lines WHERE cart_id = $1 AND product_id = $2")
            .bind(cart_id)
            .bind(product_id)
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
    } else {
        let product = current_product(&mut tx, product_id).await?;
        if product.currency.trim() != cart_currency {
            return Err(ApiError::new(StatusCode::CONFLICT, "Product currency does not match the cart"));
        }
        check_stock(&mut tx, &product, payload.quantity).await?;
        sqlx::query(
            "UPDATE cart_lines
             SET quantity = $3, unit_price = $4, currency = $5, tax_rate_bp = $6
             WHERE cart_id = $1 AND product_id = $2",
        )
        .bind(cart_id)
        .bind(product.id)
        .bind(payload.quantity)
        .bind(product.price_catalog)
        .bind(product.currency.trim())
        .bind(product.tax_rate_bp)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }
    let cart = load_cart(&mut tx, cart_id, cart_currency, &display).await?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok(Json(cart))
}

async fn delete_cart_item(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(product_id): Path<i64>,
) -> ApiResult<StatusCode> {
    let owner = cart_owner(&headers, &pool).await?;
    if product_id <= 0 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid product id"));
    }
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let (cart_id, _) = lock_open_cart(&mut tx, &owner, false).await?;
    let result = sqlx::query("DELETE FROM cart_lines WHERE cart_id = $1 AND product_id = $2")
        .bind(cart_id)
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    if result.rows_affected() == 0 {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "Cart item not found"));
    }
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, FromRow)]
struct CheckoutLine {
    product_id: i64,
    quantity: i32,
    sku: String,
    name: SqlJson<Value>,
    price_catalog: i64,
    currency: String,
    tax_rate_bp: i32,
    stock_tracked: bool,
    allow_out_of_stock: bool,
    weight_grams: Option<i32>,
    is_active: bool,
    is_sellable: bool,
    is_published: bool,
}

struct MoneyBreakdown {
    unit_price_excl_tax: i64,
    total_excl_tax: i64,
    discount_excl_tax: i64,
    tax_amount: i64,
    total_incl_tax: i64,
}

fn as_i64(value: i128) -> ApiResult<i64> {
    i64::try_from(value).map_err(|_| ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Order amount is out of range"))
}

fn calculate_money(price: i64, quantity: i32, rate_bp: i32, display: &str) -> ApiResult<MoneyBreakdown> {
    if price < 0 || quantity <= 0 || rate_bp < 0 {
        return Err(ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Invalid price or tax configuration"));
    }
    let quantity = i128::from(quantity);
    let rate = i128::from(rate_bp);
    let total_catalog = i128::from(price)
        .checked_mul(quantity)
        .ok_or_else(ApiError::internal)?;
    let denominator = 10_000_i128
        .checked_add(rate)
        .ok_or_else(ApiError::internal)?;
    let unit_exclusive = if display == "ttc" {
        (i128::from(price) * 10_000 + denominator / 2) / denominator
    } else {
        i128::from(price)
    };
    let (exclusive, tax, inclusive) = if display == "ttc" {
        let exclusive = (total_catalog * 10_000 + denominator / 2) / denominator;
        (exclusive, total_catalog - exclusive, total_catalog)
    } else {
        let tax = (total_catalog * rate + 5_000) / 10_000;
        (total_catalog, tax, total_catalog + tax)
    };
    Ok(MoneyBreakdown {
        unit_price_excl_tax: as_i64(unit_exclusive)?,
        total_excl_tax: as_i64(exclusive)?,
        discount_excl_tax: 0,
        tax_amount: as_i64(tax)?,
        total_incl_tax: as_i64(inclusive)?,
    })
}

fn tax_on_exclusive(amount: i64, rate_bp: i32) -> ApiResult<i64> {
    if amount < 0 || rate_bp < 0 {
        return Err(ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Invalid price or tax configuration"));
    }
    let tax = (i128::from(amount) * i128::from(rate_bp) + 5_000) / 10_000;
    as_i64(tax)
}

#[derive(Debug, FromRow)]
struct PromotionRow {
    id: i64,
    discount_kind: String,
    discount_bp: Option<i32>,
    discount_amount: Option<i64>,
    currency: Option<String>,
    max_discount_amount: Option<i64>,
}

async fn load_promotion(
    tx: &mut Transaction<'_, Postgres>,
    raw_code: Option<&str>,
    currency: &str,
    subtotal_excl_tax: i64,
    quantity: i32,
) -> ApiResult<Option<(PromotionRow, Option<String>, i64)>> {
    let code = raw_code.map(str::trim).filter(|value| !value.is_empty());
    if code.is_some_and(|value| value.chars().count() > 100) {
        return Err(ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Promotion code is invalid"));
    }
    let promotion: Option<PromotionRow> = sqlx::query_as(
        "SELECT id, discount_kind, discount_bp, discount_amount, currency,
                max_discount_amount
         FROM promotions
         WHERE (($1::TEXT IS NOT NULL AND lower(code) = lower($1))
             OR ($1::TEXT IS NULL AND code IS NULL))
           AND is_active = true
           AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
           AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP)
           AND (usage_limit IS NULL OR used_count < usage_limit)
           AND (min_order_amount IS NULL OR min_order_amount <= $2)
           AND (min_quantity IS NULL OR min_quantity <= $3)
           AND (currency IS NULL OR currency = $4)
         ORDER BY id LIMIT 1 FOR UPDATE",
    )
    .bind(code)
    .bind(subtotal_excl_tax)
    .bind(quantity)
    .bind(currency)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let Some(promotion) = promotion else {
        return if code.is_some() {
            Err(ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Promotion code is unavailable"))
        } else {
            Ok(None)
        };
    };
    let amount = match promotion.discount_kind.as_str() {
        "percent" => {
            let rate = promotion.discount_bp.ok_or_else(ApiError::internal)?;
            as_i64((i128::from(subtotal_excl_tax) * i128::from(rate) + 5_000) / 10_000)?
        }
        "fixed_amount" => promotion.discount_amount.ok_or_else(ApiError::internal)?,
        _ => return Err(ApiError::internal()),
    };
    let amount = promotion
        .max_discount_amount
        .map_or(amount, |maximum| amount.min(maximum))
        .min(subtotal_excl_tax);
    if amount <= 0 {
        return if code.is_some() {
            Err(ApiError::new(
                StatusCode::UNPROCESSABLE_ENTITY,
                "Promotion does not apply to this order",
            ))
        } else {
            Ok(None)
        };
    }
    Ok(Some((promotion, code.map(str::to_owned), amount)))
}

#[derive(Deserialize)]
struct CheckoutRequest {
    billing_address: Value,
    shipping_address: Value,
    shipping_method_id: Option<i64>,
    promotion_code: Option<String>,
}

fn address_value(object: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| object.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(str::to_owned)
}

fn required_address_value(object: &Map<String, Value>, keys: &[&str]) -> ApiResult<String> {
    address_value(object, keys)
        .filter(|value| value.chars().count() <= 500)
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Checkout address is incomplete"))
}

fn country_code(value: &str) -> ApiResult<String> {
    let normalized = value.trim().to_lowercase();
    let code = match normalized.as_str() {
        "france" => "FR",
        "allemagne" | "germany" | "deutschland" => "DE",
        "espagne" | "spain" | "españa" => "ES",
        "italie" | "italy" | "italia" => "IT",
        "belgique" | "belgium" => "BE",
        "suisse" | "switzerland" | "schweiz" => "CH",
        "canada" => "CA",
        "états-unis" | "etats-unis" | "united states" | "usa" => "US",
        "royaume-uni" | "united kingdom" | "great britain" | "uk" => "GB",
        "pays-bas" | "netherlands" | "nederland" => "NL",
        "portugal" => "PT",
        _ => {
            let code = value.trim().to_ascii_uppercase();
            if code.len() == 2 && code.chars().all(|character| character.is_ascii_uppercase()) {
                return Ok(code);
            }
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "Country must be a supported name or ISO 3166-1 alpha-2 code",
            ));
        }
    };
    Ok(code.to_owned())
}

fn normalize_checkout_address(value: Value) -> ApiResult<Value> {
    let object = value
        .as_object()
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Checkout address must be an object"))?;
    let recipient = match address_value(object, &["recipient"]) {
        Some(recipient) => recipient,
        None => {
            let first_name = required_address_value(object, &["first_name"])?;
            let last_name = required_address_value(object, &["last_name"])?;
            format!("{first_name} {last_name}")
        }
    };
    if recipient.chars().count() > 200 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Checkout recipient is too long"));
    }
    let street1 = required_address_value(object, &["street1", "address_line1"])?;
    let zip = required_address_value(object, &["zip", "postal_code"])?;
    let city = required_address_value(object, &["city"])?;
    let country = country_code(&required_address_value(object, &["country"])? )?;
    let mut address = Map::new();
    address.insert("recipient".to_owned(), Value::String(recipient));
    address.insert("street1".to_owned(), Value::String(street1));
    address.insert("zip".to_owned(), Value::String(zip));
    address.insert("city".to_owned(), Value::String(city));
    address.insert("country".to_owned(), Value::String(country));
    if let Some(street2) = address_value(object, &["street2", "address_line2"]) {
        address.insert("street2".to_owned(), Value::String(street2));
    }
    if let Some(region) = address_value(object, &["region"]) {
        address.insert("region".to_owned(), Value::String(region));
    }
    if let Some(email) = address_value(object, &["email"]) {
        address.insert("email".to_owned(), Value::String(validate_email(&email)?));
    }
    if let Some(phone) = address_value(object, &["phone"]) {
        if phone.chars().count() > 80 {
            return Err(ApiError::new(StatusCode::BAD_REQUEST, "Checkout phone number is too long"));
        }
        address.insert("phone".to_owned(), Value::String(phone));
    }
    Ok(Value::Object(address))
}

#[derive(Deserialize)]
struct CustomerAddressRequest {
    address_type: String,
    recipient: String,
    street1: String,
    street2: Option<String>,
    zip: String,
    city: String,
    country: String,
    region: Option<String>,
}

struct NormalizedCustomerAddress {
    address_type: String,
    recipient: String,
    street1: String,
    street2: Option<String>,
    zip: String,
    city: String,
    country: String,
    region: Option<String>,
}

fn normalize_customer_address(
    payload: CustomerAddressRequest,
) -> ApiResult<NormalizedCustomerAddress> {
    if !["billing", "shipping", "both"].contains(&payload.address_type.as_str()) {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid address type"));
    }
    let value = normalize_checkout_address(json!({
        "recipient": payload.recipient,
        "street1": payload.street1,
        "street2": payload.street2,
        "zip": payload.zip,
        "city": payload.city,
        "country": payload.country,
        "region": payload.region,
    }))?;
    let object = value.as_object().ok_or_else(ApiError::internal)?;
    Ok(NormalizedCustomerAddress {
        address_type: payload.address_type,
        recipient: required_address_value(object, &["recipient"] )?,
        street1: required_address_value(object, &["street1"] )?,
        street2: address_value(object, &["street2"]),
        zip: required_address_value(object, &["zip"] )?,
        city: required_address_value(object, &["city"] )?,
        country: required_address_value(object, &["country"] )?,
        region: address_value(object, &["region"]),
    })
}

#[derive(Debug, FromRow, Serialize)]
struct CustomerAddressResponse {
    id: i64,
    address_type: String,
    recipient: String,
    street1: String,
    street2: Option<String>,
    zip: String,
    city: String,
    country: String,
    region: Option<String>,
}

async fn customer_addresses(
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<CustomerAddressResponse>>> {
    let customer = customer_id(&headers, &pool).await?;
    let addresses = sqlx::query_as::<_, CustomerAddressResponse>(
        "SELECT id, address_type, recipient, street1, street2, zip, city, country, region
         FROM customer_addresses
         WHERE customer_id = $1
         ORDER BY id",
    )
    .bind(customer)
    .fetch_all(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    Ok(Json(addresses))
}

async fn create_customer_address(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<CustomerAddressRequest>,
) -> ApiResult<(StatusCode, Json<CustomerAddressResponse>)> {
    let customer = customer_id(&headers, &pool).await?;
    let address = normalize_customer_address(payload)?;
    let row = sqlx::query_as::<_, CustomerAddressResponse>(
        "INSERT INTO customer_addresses (
            customer_id, address_type, recipient, street1, street2, zip, city, country, region
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, address_type, recipient, street1, street2, zip, city, country, region",
    )
    .bind(customer)
    .bind(address.address_type)
    .bind(address.recipient)
    .bind(address.street1)
    .bind(address.street2)
    .bind(address.zip)
    .bind(address.city)
    .bind(address.country)
    .bind(address.region)
    .fetch_one(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    Ok((StatusCode::CREATED, Json(row)))
}

async fn update_customer_address(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(address_id): Path<i64>,
    Json(payload): Json<CustomerAddressRequest>,
) -> ApiResult<Json<CustomerAddressResponse>> {
    let customer = customer_id(&headers, &pool).await?;
    if address_id <= 0 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid address id"));
    }
    let address = normalize_customer_address(payload)?;
    let row = sqlx::query_as::<_, CustomerAddressResponse>(
        "UPDATE customer_addresses
         SET address_type = $3, recipient = $4, street1 = $5, street2 = $6,
             zip = $7, city = $8, country = $9, region = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND customer_id = $2
         RETURNING id, address_type, recipient, street1, street2, zip, city, country, region",
    )
    .bind(address_id)
    .bind(customer)
    .bind(address.address_type)
    .bind(address.recipient)
    .bind(address.street1)
    .bind(address.street2)
    .bind(address.zip)
    .bind(address.city)
    .bind(address.country)
    .bind(address.region)
    .fetch_optional(&pool)
    .await
    .map_err(|_| ApiError::internal())?
    .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Address not found"))?;
    Ok(Json(row))
}

async fn delete_customer_address(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(address_id): Path<i64>,
) -> ApiResult<StatusCode> {
    let customer = customer_id(&headers, &pool).await?;
    if address_id <= 0 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid address id"));
    }
    let result = sqlx::query("DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2")
        .bind(address_id)
        .bind(customer)
        .execute(&pool)
        .await
        .map_err(|_| ApiError::internal())?;
    if result.rows_affected() == 0 {
        return Err(ApiError::new(StatusCode::NOT_FOUND, "Address not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Serialize)]
struct CheckoutResponse {
    order_number: String,
    status: &'static str,
    payment_status: &'static str,
    currency: String,
    total: i64,
}

#[derive(Debug, FromRow)]
struct ShippingMethodRow {
    id: i64,
    name: SqlJson<Value>,
    pricing_type: String,
    fixed_price: Option<i64>,
    currency: String,
    tax_rate_bp: i32,
    free_over_amount: Option<i64>,
    max_weight_grams: Option<i32>,
    countries: Option<SqlJson<Value>>,
}

#[derive(Debug, FromRow)]
struct PublicShippingMethodRow {
    id: i64,
    name: SqlJson<Value>,
    currency: String,
    pricing_type: String,
    fixed_price: Option<i64>,
    free_over_amount: Option<i64>,
}

#[derive(Serialize)]
struct PublicShippingMethodResponse {
    id: i64,
    name: Value,
    currency: String,
    pricing_type: String,
    fixed_price: Option<i64>,
    free_over_amount: Option<i64>,
}

async fn public_shipping_methods(
    State(pool): State<PgPool>,
) -> ApiResult<Json<Vec<PublicShippingMethodResponse>>> {
    let rows = sqlx::query_as::<_, PublicShippingMethodRow>(
        "SELECT id, name, currency, pricing_type, fixed_price, free_over_amount
         FROM shipping_methods
         WHERE is_published = true ORDER BY position, id",
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    Ok(Json(
        rows.into_iter()
            .map(|row| PublicShippingMethodResponse {
                id: row.id,
                name: row.name.0,
                currency: row.currency.trim().to_owned(),
                pricing_type: row.pricing_type,
                fixed_price: row.fixed_price,
                free_over_amount: row.free_over_amount,
            })
            .collect(),
    ))
}

#[derive(Debug, FromRow)]
struct ShippingRuleRow {
    base_price: i64,
    price_per_unit: i64,
}

fn localized_text(value: &Value, locale: &str) -> ApiResult<String> {
    let object = value
        .as_object()
        .ok_or_else(|| ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Shipping name is invalid"))?;
    if let Some(text) = object.get(locale).and_then(Value::as_str) {
        return Ok(text.to_owned());
    }
    if let Some(text) = object.get("fr").and_then(Value::as_str) {
        return Ok(text.to_owned());
    }
    object
        .values()
        .find_map(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Shipping name is invalid"))
}

async fn shipping_cost(
    tx: &mut Transaction<'_, Postgres>,
    method_id: i64,
    currency: &str,
    country: &str,
    subtotal_excl_tax: i64,
    lines: &[CheckoutLine],
) -> ApiResult<(ShippingMethodRow, i64)> {
    let method: ShippingMethodRow = sqlx::query_as(
        "SELECT sm.id, sm.name, sm.pricing_type, sm.fixed_price, sm.currency,
                t.rate_bp AS tax_rate_bp, sm.free_over_amount, sm.max_weight_grams,
                sm.countries
         FROM shipping_methods sm
         JOIN tax_rates t ON t.id = sm.tax_rate_id
         WHERE sm.id = $1 AND sm.is_published = true
         FOR UPDATE OF sm",
    )
    .bind(method_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_| ApiError::internal())?
    .ok_or_else(|| ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Shipping method is unavailable"))?;
    if method.currency.trim() != currency {
        return Err(ApiError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Shipping currency does not match the cart",
        ));
    }
    if let Some(countries) = method.countries.as_ref() {
        let allowed = countries
            .0
            .as_array()
            .is_some_and(|values| values.iter().any(|value| value.as_str() == Some(country)))
            || countries
                .0
                .as_object()
                .and_then(|values| values.get(country))
                .and_then(Value::as_bool)
                .unwrap_or(false);
        if !allowed {
            return Err(ApiError::new(
                StatusCode::UNPROCESSABLE_ENTITY,
                "Shipping method is not available in the destination country",
            ));
        }
    }
    let total_weight: Option<i64> = lines.iter().try_fold(0_i64, |sum, line| {
        let weight = line.weight_grams?;
        sum.checked_add(i64::from(weight).checked_mul(i64::from(line.quantity))?)
    });
    if let Some(max_weight) = method.max_weight_grams.filter(|weight| *weight > 0) {
        if total_weight.map_or(true, |weight| weight > i64::from(max_weight)) {
            return Err(ApiError::new(
                StatusCode::UNPROCESSABLE_ENTITY,
                "Shipping method is unavailable for this order weight",
            ));
        }
    }
    if method.free_over_amount.is_some_and(|threshold| subtotal_excl_tax >= threshold) {
        return Ok((method, 0));
    }
    let price = match method.pricing_type.as_str() {
        "fixed" => method.fixed_price.ok_or_else(|| {
            ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Shipping price is not configured")
        })?,
        "rules" => {
            let variables: Vec<String> = sqlx::query_scalar(
                "SELECT DISTINCT variable FROM shipping_price_rules
                 WHERE shipping_method_id = $1 ORDER BY variable",
            )
            .bind(method.id)
            .fetch_all(&mut **tx)
            .await
            .map_err(|_| ApiError::internal())?;
            if variables.len() != 1 {
                return Err(ApiError::new(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Shipping rules are missing or ambiguous",
                ));
            }
            let variable = &variables[0];
            let quantity = lines.iter().try_fold(0_i64, |sum, line| {
                sum.checked_add(i64::from(line.quantity))
            }).ok_or_else(ApiError::internal)?;
            let metric = match variable.as_str() {
                "weight" => total_weight.ok_or_else(|| {
                    ApiError::new(
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "Product weight is required for shipping rules",
                    )
                })?,
                "amount" => subtotal_excl_tax,
                "quantity" => quantity,
                _ => return Err(ApiError::new(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Shipping rule variable is unsupported",
                )),
            };
            let metric = i32::try_from(metric).map_err(|_| {
                ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Shipping metric is out of range")
            })?;
            let rule: Option<ShippingRuleRow> = sqlx::query_as(
                "SELECT base_price, price_per_unit
                 FROM shipping_price_rules
                 WHERE shipping_method_id = $1 AND variable = $2 AND max_value >= $3
                 ORDER BY max_value ASC LIMIT 1",
            )
            .bind(method.id)
            .bind(variable)
            .bind(metric)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|_| ApiError::internal())?;
            let rule = rule.ok_or_else(|| {
                ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "No shipping price rule covers this order")
            })?;
            let amount = i128::from(rule.base_price)
                .checked_add(i128::from(rule.price_per_unit) * i128::from(metric))
                .ok_or_else(ApiError::internal)?;
            as_i64(amount)?
        }
        _ => {
            return Err(ApiError::new(
                StatusCode::UNPROCESSABLE_ENTITY,
                "Shipping pricing type is unsupported",
            ))
        }
    };
    if price < 0 {
        return Err(ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Shipping price is invalid"));
    }
    Ok((method, price))
}

fn opaque_reference(prefix: &str) -> ApiResult<String> {
    let mut bytes = [0_u8; 16];
    OsRng
        .try_fill_bytes(&mut bytes)
        .map_err(|_| ApiError::internal())?;
    let mut reference = String::with_capacity(prefix.len() + 32);
    reference.push_str(prefix);
    for byte in bytes {
        write!(&mut reference, "{byte:02x}").map_err(|_| ApiError::internal())?;
    }
    Ok(reference)
}

async fn checkout(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<CheckoutRequest>,
) -> ApiResult<(StatusCode, Json<CheckoutResponse>)> {
    let customer = customer_id(&headers, &pool).await?;
    let billing_address = normalize_checkout_address(payload.billing_address)?;
    let shipping_address = normalize_checkout_address(payload.shipping_address)?;
    if payload.shipping_method_id.is_some_and(|id| id <= 0) {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid shipping method"));
    }
    if payload.shipping_method_id.is_none() {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "A shipping method is required"));
    }
    let display = tax_display(&pool).await?;
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let cart_owner = CartOwner::Customer(customer);
    let (cart_id, cart_currency) = lock_open_cart(&mut tx, &cart_owner, false).await?;
    let lines = sqlx::query_as::<_, CheckoutLine>(
        "SELECT cl.id AS line_id, p.id AS product_id, cl.quantity, p.sku, p.name,
                p.price_catalog, p.currency, t.rate_bp AS tax_rate_bp,
                p.stock_tracked, p.allow_out_of_stock, p.weight_grams,
                p.is_active, p.is_sellable, p.is_published
         FROM cart_lines cl
         JOIN products p ON p.id = cl.product_id
         JOIN tax_rates t ON t.id = p.tax_rate_id
         WHERE cl.cart_id = $1
         ORDER BY p.id
         FOR UPDATE OF p",
    )
    .bind(cart_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    if lines.is_empty() {
        return Err(ApiError::new(StatusCode::CONFLICT, "Cart is empty"));
    }
    let currency = cart_currency.trim().to_owned();
    let mut subtotal_excl_tax = 0_i64;
    let mut tax_total = 0_i64;
    let mut breakdowns = Vec::with_capacity(lines.len());
    for line in &lines {
        if !line.is_active || !line.is_sellable || !line.is_published {
            return Err(ApiError::new(StatusCode::CONFLICT, "A cart product is no longer available"));
        }
        if line.currency.trim() != currency {
            return Err(ApiError::new(StatusCode::CONFLICT, "Product currency does not match the cart"));
        }
        if line.stock_tracked && !line.allow_out_of_stock {
            let available: Option<i32> = sqlx::query_scalar(
                "SELECT available FROM stock_levels WHERE product_id = $1 FOR UPDATE",
            )
            .bind(line.product_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
            if available.unwrap_or(0) < line.quantity {
                return Err(ApiError::new(StatusCode::CONFLICT, "A cart product is out of stock"));
            }
        }
        let money = calculate_money(line.price_catalog, line.quantity, line.tax_rate_bp, &display)?;
        subtotal_excl_tax = subtotal_excl_tax
            .checked_add(money.total_excl_tax)
            .ok_or_else(ApiError::internal)?;
        tax_total = tax_total
            .checked_add(money.tax_amount)
            .ok_or_else(ApiError::internal)?;
        breakdowns.push(money);
    }

    let gross_products_total = subtotal_excl_tax
        .checked_add(tax_total)
        .ok_or_else(ApiError::internal)?;
    let quantity = lines.iter().try_fold(0_i32, |sum, line| {
        sum.checked_add(line.quantity)
    }).ok_or_else(ApiError::internal)?;
    let promotion = load_promotion(
        &mut tx,
        payload.promotion_code.as_deref(),
        &cart_currency,
        subtotal_excl_tax,
        quantity,
    )
    .await?;
    if let Some((_, _, discount_excl_tax)) = promotion.as_ref() {
        let original_subtotal = subtotal_excl_tax;
        let mut remaining_discount = *discount_excl_tax;
        subtotal_excl_tax = 0;
        tax_total = 0;
        for index in 0..breakdowns.len() {
            let allocation = if index + 1 == breakdowns.len() {
                remaining_discount
            } else {
                as_i64(
                    (i128::from(*discount_excl_tax)
                        * i128::from(breakdowns[index].total_excl_tax))
                        / i128::from(original_subtotal),
                )?
            };
            remaining_discount = remaining_discount
                .checked_sub(allocation)
                .ok_or_else(ApiError::internal)?;
            let net_excl_tax = breakdowns[index]
                .total_excl_tax
                .checked_sub(allocation)
                .ok_or_else(ApiError::internal)?;
            let tax_amount = tax_on_exclusive(net_excl_tax, lines[index].tax_rate_bp)?;
            let total_incl_tax = net_excl_tax
                .checked_add(tax_amount)
                .ok_or_else(ApiError::internal)?;
            breakdowns[index].discount_excl_tax = allocation;
            breakdowns[index].total_excl_tax = net_excl_tax;
            breakdowns[index].tax_amount = tax_amount;
            breakdowns[index].total_incl_tax = total_incl_tax;
            subtotal_excl_tax = subtotal_excl_tax
                .checked_add(net_excl_tax)
                .ok_or_else(ApiError::internal)?;
            tax_total = tax_total
                .checked_add(tax_amount)
                .ok_or_else(ApiError::internal)?;
        }
    }
    let discount_total = gross_products_total
        .checked_sub(
            subtotal_excl_tax
                .checked_add(tax_total)
                .ok_or_else(ApiError::internal)?,
        )
        .ok_or_else(ApiError::internal)?;

    let mut shipping_method: Option<ShippingMethodRow> = None;
    let mut shipping_price = 0_i64;
    let mut shipping_money: Option<MoneyBreakdown> = None;
    let mut shipping_name: Option<String> = None;
    let mut customer_locale: Option<String> = None;
    let mut customer_email: Option<String> = None;
    if let Some(method_id) = payload.shipping_method_id {
        let (method, price) = shipping_cost(
            &mut tx,
            method_id,
            &currency,
            shipping_address
                .get("country")
                .and_then(Value::as_str)
                .ok_or_else(ApiError::internal)?,
            subtotal_excl_tax,
            &lines,
        )
        .await?;
        let (locale, email): (String, String) =
            sqlx::query_as("SELECT locale, email FROM customers WHERE id = $1 AND is_active = true")
                .bind(customer)
                .fetch_one(&mut *tx)
                .await
                .map_err(|_| ApiError::internal())?;
        let localized_name = localized_text(&method.name.0, &locale)?;
        let money = calculate_money(price, 1, method.tax_rate_bp, &display)?;
        shipping_price = money.total_excl_tax;
        tax_total = tax_total
            .checked_add(money.tax_amount)
            .ok_or_else(ApiError::internal)?;
        shipping_name = Some(localized_name);
        customer_locale = Some(locale);
        customer_email = Some(email);
        shipping_money = Some(money);
        shipping_method = Some(method);
    }
    let total = subtotal_excl_tax
        .checked_add(tax_total)
        .and_then(|value| value.checked_add(shipping_price))
        .ok_or_else(ApiError::internal)?;
    let amount_due = total;

    let provider: Option<(i64, SqlJson<Value>)> = if amount_due > 0 {
        Some(
            sqlx::query_as(
                "SELECT id, config FROM payment_providers
                 WHERE code = 'mock' AND is_published = true AND mode IN ('enabled', 'test')
                 FOR UPDATE",
            )
            .fetch_optional(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?
            .ok_or_else(|| ApiError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "No mock payment provider is available",
            ))?,
        )
    } else {
        None
    };
    if let Some((_, config)) = provider.as_ref() {
        let scenario = match config.0.get("scenario").and_then(Value::as_str) {
            Some("success") => MockScenario::Success,
            Some("failure") | Some("decline") => MockScenario::Failure,
            Some("pending") => MockScenario::Pending,
            _ => {
                return Err(ApiError::new(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Mock payment scenario is not configured",
                ))
            }
        };
        let mock = MockPaymentProvider { scenario };
        let authorization = mock
            .authorize(amount_due, &currency)
            .map_err(|_| ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Mock payment request is invalid"))?;
        let captured = match &authorization {
            PaymentOutcome::Authorized => mock
                .capture(&authorization)
                .map_err(|_| ApiError::internal())?,
            PaymentOutcome::Failed => {
                return Err(ApiError::new(StatusCode::PAYMENT_REQUIRED, "Mock payment was declined"))
            }
            PaymentOutcome::Pending => {
                return Err(ApiError::new(StatusCode::CONFLICT, "Mock payment is pending"))
            }
            _ => return Err(ApiError::internal()),
        };
        if captured != PaymentOutcome::Captured {
            return Err(ApiError::internal());
        }
    }

    let locale = customer_locale.unwrap_or_else(|| "fr".to_owned());
    let order_number = opaque_reference("SF-")?;
    let access_token = opaque_reference("access-")?;
    let shipping_method_id = shipping_method.as_ref().map(|method| method.id);
    let frozen_shipping_name = shipping_name.clone();
    let promotion_id = promotion.as_ref().map(|(promotion, _, _)| promotion.id);
    let promotion_code = promotion.as_ref().and_then(|(_, code, _)| code.clone());
    let order_id: i64 = sqlx::query_scalar(
        "INSERT INTO orders (
            order_number, customer_id, status, payment_status, currency,
            subtotal_excl_tax, tax_total, shipping_total, discount_total, total,
            billing_address, shipping_address, shipping_method_id, shipping_method_name,
            promotion_id, promotion_code, access_token, placed_at
         )
         VALUES ($1, $2, 'pending_payment', 'pending', $3, $4, $5, $6, $7, $8,
                 $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
         RETURNING id",
    )
    .bind(&order_number)
    .bind(customer)
    .bind(&currency)
    .bind(subtotal_excl_tax)
    .bind(tax_total)
    .bind(shipping_price)
    .bind(discount_total)
    .bind(total)
    .bind(SqlJson(billing_address))
    .bind(SqlJson(shipping_address))
    .bind(shipping_method_id)
    .bind(frozen_shipping_name.as_deref())
    .bind(promotion_id)
    .bind(promotion_code)
    .bind(&access_token)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;

    for (line, money) in lines.iter().zip(breakdowns.iter()) {
        sqlx::query(
            "INSERT INTO order_lines (
                order_id, product_id, sku, name, quantity, unit_price_excl_tax,
                discount_excl_tax, tax_rate_bp, tax_amount, total_excl_tax,
                total_incl_tax, currency, is_shipping
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false)",
        )
        .bind(order_id)
        .bind(line.product_id)
        .bind(&line.sku)
        .bind(&line.name)
        .bind(line.quantity)
        .bind(money.unit_price_excl_tax)
        .bind(money.discount_excl_tax)
        .bind(line.tax_rate_bp)
        .bind(money.tax_amount)
        .bind(money.total_excl_tax)
        .bind(money.total_incl_tax)
        .bind(&currency)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        sqlx::query(
            "UPDATE cart_lines
             SET unit_price = $3, currency = $4, tax_rate_bp = $5
             WHERE cart_id = $1 AND product_id = $2",
        )
        .bind(cart_id)
        .bind(line.product_id)
        .bind(line.price_catalog)
        .bind(line.currency.trim())
        .bind(line.tax_rate_bp)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }
    if let (Some(method), Some(money), Some(name)) = (
        shipping_method.as_ref(),
        shipping_money.as_ref(),
        shipping_name.as_ref(),
    ) {
        let mut name_snapshot = serde_json::Map::new();
        name_snapshot.insert(locale, Value::String(name.clone()));
        sqlx::query(
            "INSERT INTO order_lines (
                order_id, product_id, sku, name, quantity, unit_price_excl_tax,
                tax_rate_bp, tax_amount, total_excl_tax, total_incl_tax, currency, is_shipping
             )
             VALUES ($1, NULL, 'SHIPPING', $2, 1, $3, $4, $5, $6, $7, $8, true)",
        )
        .bind(order_id)
        .bind(SqlJson(Value::Object(name_snapshot)))
        .bind(money.unit_price_excl_tax)
        .bind(method.tax_rate_bp)
        .bind(money.tax_amount)
        .bind(money.total_excl_tax)
        .bind(money.total_incl_tax)
        .bind(&currency)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }

    if let Some((provider_id, _)) = provider {
        let reference = opaque_reference("mock-")?;
        sqlx::query(
            "INSERT INTO payment_transactions (
                order_id, provider_id, reference, operation, amount, currency,
                status, status_message, last_state_change
             )
             VALUES ($1, $2, $3, 'payment', $4, $5, 'done',
                     'Deterministic mock payment succeeded', CURRENT_TIMESTAMP)",
        )
        .bind(order_id)
        .bind(provider_id)
        .bind(reference)
        .bind(amount_due)
        .bind(&currency)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }
    sqlx::query(
        "UPDATE orders
         SET status = 'confirmed', payment_status = 'paid',
             confirmed_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'pending_payment'",
    )
    .bind(order_id)
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;

    sqlx::query("INSERT INTO shipments (order_id, status) VALUES ($1, 'pending')")
        .bind(order_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;

    if let Some(email) = customer_email.as_deref() {
        sqlx::query(
            "INSERT INTO notifications (template_key, recipient_email, channel, status, order_id)
             VALUES ('order_confirmed', $1, 'email', 'pending', $2)",
        )
        .bind(email)
        .bind(order_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }

    for line in &lines {
        if !line.stock_tracked {
            continue;
        }
        let available: Option<i32> = sqlx::query_scalar(
            "SELECT available FROM stock_levels WHERE product_id = $1 FOR UPDATE",
        )
        .bind(line.product_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        let reserved_quantity = match available {
            Some(available) if line.allow_out_of_stock => available.min(line.quantity),
            Some(available) if available >= line.quantity => line.quantity,
            Some(_) => {
                return Err(ApiError::new(StatusCode::CONFLICT, "Stock changed during checkout"))
            }
            None if line.allow_out_of_stock => continue,
            None => {
                return Err(ApiError::new(StatusCode::CONFLICT, "Stock changed during checkout"))
            }
        };
        if reserved_quantity == 0 {
            continue;
        }
        let changed: Option<i32> = sqlx::query_scalar(
            "UPDATE stock_levels
             SET quantity_reserved = quantity_reserved + $2
             WHERE product_id = $1
               AND quantity_reserved + $2 <= quantity_on_hand
             RETURNING quantity_reserved",
        )
        .bind(line.product_id)
        .bind(reserved_quantity)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        if changed.is_none() {
            return Err(ApiError::new(StatusCode::CONFLICT, "Stock changed during checkout"));
        }
        let actor = format!("customer:{customer}");
        sqlx::query(
            "INSERT INTO stock_moves (product_id, quantity, move_type, order_id, actor)
             VALUES ($1, $2, 'reservation', $3, $4)",
        )
        .bind(line.product_id)
        .bind(reserved_quantity)
        .bind(order_id)
        .bind(actor)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }
    sqlx::query("UPDATE carts SET status = 'converted' WHERE id = $1 AND status = 'open'")
        .bind(cart_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    if let Some((promotion, _, _)) = promotion.as_ref() {
        let updated: Option<i32> = sqlx::query_scalar(
            "UPDATE promotions SET used_count = used_count + 1
             WHERE id = $1 AND (usage_limit IS NULL OR used_count < usage_limit)
             RETURNING used_count",
        )
        .bind(promotion.id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        if updated.is_none() {
            return Err(ApiError::new(StatusCode::CONFLICT, "Promotion usage limit was reached"));
        }
    }
    sqlx::query(
        "INSERT INTO audit_logs (entity_type, entity_id, event, actor, diff)
         VALUES ('order', $1, 'order.confirmed', $2, $3)",
    )
    .bind(order_id)
    .bind(format!("customer:{customer}"))
    .bind(SqlJson(json!({
        "status": "confirmed",
        "payment_status": "paid",
        "subtotal_excl_tax": subtotal_excl_tax,
        "tax_total": tax_total,
        "shipping_total": shipping_price,
        "discount_total": discount_total,
        "total": total
    })))
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok((
        StatusCode::CREATED,
        Json(CheckoutResponse {
            order_number,
            status: "confirmed",
            payment_status: "paid",
            currency,
            total: amount_due,
        }),
    ))
}

#[derive(Debug, FromRow)]
struct OrderRow {
    order_number: String,
    status: String,
    payment_status: String,
    currency: String,
    total: i64,
    placed_at: Option<DateTime<Utc>>,
}

#[derive(Serialize)]
struct OrderResponse {
    order_number: String,
    status: String,
    payment_status: String,
    currency: String,
    total: i64,
    placed_at: Option<DateTime<Utc>>,
}

impl From<OrderRow> for OrderResponse {
    fn from(row: OrderRow) -> Self {
        Self {
            order_number: row.order_number,
            status: row.status,
            payment_status: row.payment_status,
            currency: row.currency.trim().to_owned(),
            total: row.total,
            placed_at: row.placed_at,
        }
    }
}

async fn customer_orders(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<Vec<OrderResponse>>> {
    let customer = customer_id(&headers, &pool).await?;
    let (limit, offset) = pagination.values()?;
    let rows = sqlx::query_as::<_, OrderRow>(
        "SELECT order_number, status, payment_status, currency, total, placed_at
         FROM orders WHERE customer_id = $1
         ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3",
    )
    .bind(customer)
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    Ok(Json(rows.into_iter().map(OrderResponse::from).collect()))
}

#[derive(Deserialize)]
struct ReturnRequestBody {
    reason: String,
}

#[derive(Serialize)]
struct ReturnResponse {
    id: i64,
    status: &'static str,
}

async fn request_return(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(reference): Path<String>,
    Json(payload): Json<ReturnRequestBody>,
) -> ApiResult<(StatusCode, Json<ReturnResponse>)> {
    let customer = customer_id(&headers, &pool).await?;
    let reason = payload.reason.trim();
    if reason.is_empty() || reason.chars().count() > 2000 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "A return reason is required"));
    }
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let order: Option<(i64, String)> = sqlx::query_as(
        "SELECT id, status FROM orders
         WHERE order_number = $1 AND customer_id = $2
         FOR UPDATE",
    )
    .bind(&reference)
    .bind(customer)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let (order_id, status) = order.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Order not found"))?;
    if status != "delivered" {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "Returns can only be requested for delivered orders",
        ));
    }
    let order_lines: Vec<(i64, i32)> = sqlx::query_as(
        "SELECT id, quantity FROM order_lines
         WHERE order_id = $1 AND is_shipping = false
         ORDER BY id FOR UPDATE",
    )
    .bind(order_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let mut returnable_lines = Vec::new();
    for (order_line_id, ordered_quantity) in order_lines {
        let already_requested: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(rl.quantity), 0)::BIGINT
             FROM return_lines rl
             JOIN return_requests rr ON rr.id = rl.return_request_id
             WHERE rr.order_id = $1 AND rl.order_line_id = $2
               AND rr.status NOT IN ('rejected', 'cancelled')",
        )
        .bind(order_id)
        .bind(order_line_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        let remaining = i64::from(ordered_quantity)
            .checked_sub(already_requested)
            .ok_or_else(ApiError::internal)?;
        if remaining < 0 {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "Existing return quantities exceed the order line",
            ));
        }
        if remaining > 0 {
            let quantity = i32::try_from(remaining).map_err(|_| ApiError::internal())?;
            returnable_lines.push((order_line_id, quantity));
        }
    }
    if returnable_lines.is_empty() {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "There are no remaining product quantities to return",
        ));
    }
    let request_id: i64 = sqlx::query_scalar(
        "INSERT INTO return_requests (order_id, customer_id, status, reason)
         VALUES ($1, $2, 'requested', $3) RETURNING id",
    )
    .bind(order_id)
    .bind(customer)
    .bind(reason)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    for (order_line_id, quantity) in returnable_lines {
        sqlx::query(
            "INSERT INTO return_lines (return_request_id, order_line_id, quantity, restock)
             VALUES ($1, $2, $3, false)",
        )
        .bind(request_id)
        .bind(order_line_id)
        .bind(quantity)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }
    sqlx::query(
        "INSERT INTO audit_logs (entity_type, entity_id, event, actor, diff)
         VALUES ('return_request', $1, 'return.requested', $2, $3)",
    )
    .bind(request_id)
    .bind(format!("customer:{customer}"))
    .bind(SqlJson(json!({"status": "requested", "order_id": order_id})))
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok((
        StatusCode::CREATED,
        Json(ReturnResponse {
            id: request_id,
            status: "requested",
        }),
    ))
}

#[derive(Debug, FromRow)]
struct AdminProductRow {
    id: i64,
    sku: String,
    name: SqlJson<Value>,
    price_catalog: i64,
    currency: String,
    is_active: bool,
    is_sellable: bool,
    is_published: bool,
    stock_tracked: bool,
    quantity_on_hand: Option<i32>,
}

#[derive(Serialize)]
struct AdminProductResponse {
    id: i64,
    sku: String,
    name: Value,
    price_catalog: i64,
    currency: String,
    is_active: bool,
    is_sellable: bool,
    is_published: bool,
    stock_tracked: bool,
    quantity_on_hand: Option<i32>,
}

async fn admin_products(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<Vec<AdminProductResponse>>> {
    let _ = admin_id(&headers, &pool, &["manager", "editor", "operator"]).await?;
    let (limit, offset) = pagination.values()?;
    let rows = sqlx::query_as::<_, AdminProductRow>(
        "SELECT p.id, p.sku, p.name, p.price_catalog, p.currency, p.is_active,
                p.is_sellable, p.is_published, p.stock_tracked,
                sl.quantity_on_hand
         FROM products p
         LEFT JOIN stock_levels sl ON sl.product_id = p.id
         ORDER BY p.id LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    let products = rows
        .into_iter()
        .map(|row| AdminProductResponse {
            id: row.id,
            sku: row.sku,
            name: row.name.0,
            price_catalog: row.price_catalog,
            currency: row.currency.trim().to_owned(),
            is_active: row.is_active,
            is_sellable: row.is_sellable,
            is_published: row.is_published,
            stock_tracked: row.stock_tracked,
            quantity_on_hand: row.quantity_on_hand,
        })
        .collect();
    Ok(Json(products))
}

#[derive(Deserialize)]
struct AdminProductUpdateRequest {
    price_catalog: Option<i64>,
    is_active: Option<bool>,
    is_sellable: Option<bool>,
    is_published: Option<bool>,
    quantity_on_hand: Option<i32>,
}

async fn update_admin_product(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(product_id): Path<i64>,
    Json(payload): Json<AdminProductUpdateRequest>,
) -> ApiResult<Json<AdminProductResponse>> {
    let (admin, role) =
        admin_id(&headers, &pool, &["manager", "operator", "editor"]).await?;
    let role = AdminRole::from_str(&role).ok_or_else(ApiError::internal)?;
    if payload.price_catalog.is_some() && !role.may_manage_prices() {
        return Err(ApiError::new(
            StatusCode::FORBIDDEN,
            "This administrator role cannot manage prices",
        ));
    }
    if payload.quantity_on_hand.is_some() && !role.may_manage_inventory() {
        return Err(ApiError::new(
            StatusCode::FORBIDDEN,
            "This administrator role cannot manage inventory",
        ));
    }
    if product_id <= 0
        || payload.price_catalog.is_some_and(|price| price < 0)
        || payload.quantity_on_hand.is_some_and(|quantity| quantity < 0)
        || (payload.price_catalog.is_none()
            && payload.is_active.is_none()
            && payload.is_sellable.is_none()
            && payload.is_published.is_none()
            && payload.quantity_on_hand.is_none())
    {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid product update"));
    }
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let existing: Option<(String, i64, i32)> = sqlx::query_as(
        "SELECT p.sku, p.price_catalog, COALESCE(sl.quantity_on_hand, 0)
         FROM products p LEFT JOIN stock_levels sl ON sl.product_id = p.id
         WHERE p.id = $1 FOR UPDATE OF p",
    )
    .bind(product_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let (sku, previous_price, previous_quantity) =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Product not found"))?;
    sqlx::query(
        "UPDATE products
         SET price_catalog = COALESCE($2, price_catalog),
             is_active = COALESCE($3, is_active),
             is_sellable = COALESCE($4, is_sellable),
             is_published = COALESCE($5, is_published),
             published_at = CASE
                 WHEN $5 = true THEN COALESCE(published_at, CURRENT_TIMESTAMP)
                 WHEN $5 = false THEN NULL
                 ELSE published_at
             END,
             stock_tracked = CASE WHEN $6 IS NULL THEN stock_tracked ELSE true END
         WHERE id = $1",
    )
    .bind(product_id)
    .bind(payload.price_catalog)
    .bind(payload.is_active)
    .bind(payload.is_sellable)
    .bind(payload.is_published)
    .bind(payload.quantity_on_hand)
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    if let Some(quantity) = payload.quantity_on_hand {
        let updated: Option<i32> = sqlx::query_scalar(
            "UPDATE stock_levels
             SET quantity_on_hand = $2
             WHERE product_id = $1 AND quantity_reserved <= $2
             RETURNING quantity_on_hand",
        )
        .bind(product_id)
        .bind(quantity)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        if updated.is_none() {
            let exists: bool =
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM stock_levels WHERE product_id = $1)")
                    .bind(product_id)
                    .fetch_one(&mut *tx)
                    .await
                    .map_err(|_| ApiError::internal())?;
            if exists {
                return Err(ApiError::new(
                    StatusCode::CONFLICT,
                    "Stock cannot be lower than the quantity already reserved",
                ));
            }
            sqlx::query("INSERT INTO stock_levels (product_id, quantity_on_hand) VALUES ($1, $2)")
                .bind(product_id)
                .bind(quantity)
                .execute(&mut *tx)
                .await
                .map_err(|_| ApiError::internal())?;
        }
        let delta = quantity.checked_sub(previous_quantity).ok_or_else(ApiError::internal)?;
        if delta != 0 {
            sqlx::query(
                "INSERT INTO stock_moves (product_id, quantity, move_type, actor)
                 VALUES ($1, $2, 'adjustment', $3)",
            )
            .bind(product_id)
            .bind(delta)
            .bind(format!("admin:{admin}"))
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
        }
    }
    sqlx::query(
        "INSERT INTO audit_logs (entity_type, entity_id, event, actor, diff)
         VALUES ('product', $1, 'product.updated', $2, $3)",
    )
    .bind(product_id)
    .bind(format!("admin:{admin}"))
    .bind(SqlJson(json!({
        "sku": sku,
        "price_catalog": payload.price_catalog.unwrap_or(previous_price),
        "quantity_on_hand": payload.quantity_on_hand.unwrap_or(previous_quantity),
        "is_active": payload.is_active,
        "is_sellable": payload.is_sellable,
        "is_published": payload.is_published
    })))
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let row: AdminProductRow = sqlx::query_as(
        "SELECT p.id, p.sku, p.name, p.price_catalog, p.currency, p.is_active,
                p.is_sellable, p.is_published, p.stock_tracked,
                sl.quantity_on_hand
         FROM products p LEFT JOIN stock_levels sl ON sl.product_id = p.id
         WHERE p.id = $1",
    )
    .bind(product_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok(Json(AdminProductResponse {
        id: row.id,
        sku: row.sku,
        name: row.name.0,
        price_catalog: row.price_catalog,
        currency: row.currency.trim().to_owned(),
        is_active: row.is_active,
        is_sellable: row.is_sellable,
        is_published: row.is_published,
        stock_tracked: row.stock_tracked,
        quantity_on_hand: row.quantity_on_hand,
    }))
}

#[derive(Debug, FromRow)]
struct AdminOrderRow {
    order_number: String,
    customer_id: i64,
    status: String,
    payment_status: String,
    shipment_status: Option<String>,
    currency: String,
    total: i64,
    created_at: DateTime<Utc>,
}

#[derive(Serialize)]
struct AdminOrderResponse {
    order_number: String,
    customer_id: i64,
    status: String,
    payment_status: String,
    shipment_status: Option<String>,
    currency: String,
    total: i64,
    created_at: DateTime<Utc>,
}

async fn admin_orders(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<Vec<AdminOrderResponse>>> {
    let _ = admin_id(&headers, &pool, &["manager", "operator"]).await?;
    let (limit, offset) = pagination.values()?;
    let rows = sqlx::query_as::<_, AdminOrderRow>(
        "SELECT o.order_number, o.customer_id, o.status, o.payment_status,
                s.status AS shipment_status, o.currency, o.total, o.created_at
         FROM orders o
         LEFT JOIN shipments s ON s.order_id = o.id
         ORDER BY o.created_at DESC, o.id DESC LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    let orders = rows
        .into_iter()
        .map(|row| AdminOrderResponse {
            order_number: row.order_number,
            customer_id: row.customer_id,
            status: row.status,
            payment_status: row.payment_status,
            shipment_status: row.shipment_status,
            currency: row.currency.trim().to_owned(),
            total: row.total,
            created_at: row.created_at,
        })
        .collect();
    Ok(Json(orders))
}

#[derive(Deserialize)]
struct ShipmentUpdateRequest {
    status: String,
    tracking_ref: Option<String>,
    tracking_url: Option<String>,
}

#[derive(Serialize)]
struct ShipmentResponse {
    order_number: String,
    status: String,
    tracking_ref: Option<String>,
}

async fn update_shipment(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(order_number): Path<String>,
    Json(payload): Json<ShipmentUpdateRequest>,
) -> ApiResult<Json<ShipmentResponse>> {
    let (admin, _) = admin_id(&headers, &pool, &["manager", "operator"]).await?;
    if payload.tracking_ref.as_ref().is_some_and(|value| value.chars().count() > 120)
        || payload.tracking_url.as_ref().is_some_and(|value| {
            value.chars().count() > 2_000
                || !(value.starts_with("https://") || value.starts_with("http://"))
        })
    {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid shipment tracking details"));
    }
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let shipment: Option<(i64, String, i64, String)> = sqlx::query_as(
        "SELECT o.id, o.status, s.id, s.status
         FROM orders o JOIN shipments s ON s.order_id = o.id
         WHERE o.order_number = $1 FOR UPDATE OF o, s",
    )
    .bind(&order_number)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let (order_id, order_status, shipment_id, shipment_status) = shipment
        .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Shipment not found"))?;
    let next = payload.status.as_str();
    let valid_transition = matches!(
        (shipment_status.as_str(), next),
        ("pending", "ready") | ("ready", "shipped") | ("shipped", "delivered")
    );
    if !valid_transition {
        return Err(ApiError::new(StatusCode::CONFLICT, "Invalid shipment status transition"));
    }
    if next == "ready" && order_status != "confirmed" {
        return Err(ApiError::new(StatusCode::CONFLICT, "Only confirmed orders can be prepared"));
    }
    let mut tracking_ref = payload.tracking_ref;
    if next == "shipped" {
        let reservations: Vec<(i64, i32)> = sqlx::query_as(
            "SELECT product_id, SUM(quantity)::INTEGER
             FROM stock_moves
             WHERE order_id = $1 AND move_type = 'reservation'
             GROUP BY product_id ORDER BY product_id",
        )
        .bind(order_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        for (product_id, quantity) in reservations {
            let updated: Option<i32> = sqlx::query_scalar(
                "UPDATE stock_levels
                 SET quantity_on_hand = quantity_on_hand - $2,
                     quantity_reserved = quantity_reserved - $2
                 WHERE product_id = $1
                   AND quantity_on_hand >= $2 AND quantity_reserved >= $2
                 RETURNING available",
            )
            .bind(product_id)
            .bind(quantity)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
            if updated.is_none() {
                return Err(ApiError::new(StatusCode::CONFLICT, "Reserved stock changed before shipment"));
            }
            sqlx::query(
                "INSERT INTO stock_moves (product_id, quantity, move_type, order_id, shipment_id, actor)
                 VALUES ($1, $2, 'shipment', $3, $4, $5)",
            )
            .bind(product_id)
            .bind(-quantity)
            .bind(order_id)
            .bind(shipment_id)
            .bind(format!("admin:{admin}"))
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
        }
        sqlx::query(
            "UPDATE shipments
             SET status = 'shipped', tracking_ref = COALESCE($2, tracking_ref),
                 tracking_url = COALESCE($3, tracking_url), shipped_at = CURRENT_TIMESTAMP
             WHERE id = $1",
        )
        .bind(shipment_id)
        .bind(tracking_ref.as_deref())
        .bind(payload.tracking_url.as_deref())
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        sqlx::query("UPDATE orders SET status = 'shipped' WHERE id = $1 AND status = 'confirmed'")
            .bind(order_id)
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
        sqlx::query(
            "INSERT INTO notifications (template_key, recipient_email, channel, status, order_id)
             SELECT 'order_shipped', c.email, 'email', 'pending', o.id
             FROM orders o JOIN customers c ON c.id = o.customer_id
             WHERE o.id = $1",
        )
        .bind(order_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    } else if next == "delivered" {
        sqlx::query(
            "UPDATE shipments SET status = 'delivered',
                 tracking_ref = COALESCE($2, tracking_ref),
                 tracking_url = COALESCE($3, tracking_url),
                 delivered_at = CURRENT_TIMESTAMP
             WHERE id = $1",
        )
        .bind(shipment_id)
        .bind(tracking_ref.as_deref())
        .bind(payload.tracking_url.as_deref())
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
        sqlx::query("UPDATE orders SET status = 'delivered' WHERE id = $1 AND status = 'shipped'")
            .bind(order_id)
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
    } else {
        sqlx::query("UPDATE shipments SET status = 'ready' WHERE id = $1")
            .bind(shipment_id)
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
    }
    let status: String = sqlx::query_scalar("SELECT status FROM shipments WHERE id = $1")
        .bind(shipment_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    let stored_tracking_ref: Option<String> =
        sqlx::query_scalar("SELECT tracking_ref FROM shipments WHERE id = $1")
            .bind(shipment_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
    sqlx::query(
        "INSERT INTO audit_logs (entity_type, entity_id, event, actor, diff)
         VALUES ('shipment', $1, $2, $3, $4)",
    )
    .bind(shipment_id)
    .bind(format!("shipment.{next}"))
    .bind(format!("admin:{admin}"))
    .bind(SqlJson(json!({"from": shipment_status, "to": next, "order_id": order_id})))
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    tracking_ref = stored_tracking_ref;
    Ok(Json(ShipmentResponse {
        order_number,
        status,
        tracking_ref,
    }))
}

#[derive(Debug, FromRow)]
struct AdminReturnRow {
    id: i64,
    order_number: String,
    status: String,
    reason: String,
    customer_email: String,
    created_at: DateTime<Utc>,
}

#[derive(Serialize)]
struct AdminReturnResponse {
    id: i64,
    order_number: String,
    status: String,
    reason: String,
    customer_email: String,
    created_at: DateTime<Utc>,
}

async fn admin_returns(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<Vec<AdminReturnResponse>>> {
    let _ = admin_id(&headers, &pool, &["manager", "operator"]).await?;
    let (limit, offset) = pagination.values()?;
    let rows = sqlx::query_as::<_, AdminReturnRow>(
        "SELECT rr.id, o.order_number, rr.status, rr.reason,
                c.email AS customer_email, rr.created_at
         FROM return_requests rr
         JOIN orders o ON o.id = rr.order_id
         JOIN customers c ON c.id = rr.customer_id
         ORDER BY rr.created_at DESC, rr.id DESC LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|_| ApiError::internal())?;
    Ok(Json(
        rows.into_iter()
            .map(|row| AdminReturnResponse {
                id: row.id,
                order_number: row.order_number,
                status: row.status,
                reason: row.reason,
                customer_email: row.customer_email,
                created_at: row.created_at,
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
struct ReturnProcessingRequest {
    action: String,
    refusal_reason: Option<String>,
    restock: Option<bool>,
}

#[derive(Serialize)]
struct ReturnProcessingResponse {
    id: i64,
    status: String,
    refunded_amount: i64,
}

async fn process_return(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(return_id): Path<i64>,
    Json(payload): Json<ReturnProcessingRequest>,
) -> ApiResult<Json<ReturnProcessingResponse>> {
    let (admin, _) = admin_id(&headers, &pool, &["manager", "operator"]).await?;
    if return_id <= 0 {
        return Err(ApiError::new(StatusCode::BAD_REQUEST, "Invalid return request"));
    }
    let mut tx = pool.begin().await.map_err(|_| ApiError::internal())?;
    let request: Option<(i64, String, String)> = sqlx::query_as(
        "SELECT rr.order_id, rr.status, c.email
         FROM return_requests rr JOIN customers c ON c.id = rr.customer_id
         WHERE rr.id = $1 FOR UPDATE OF rr",
    )
    .bind(return_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    let (order_id, current_status, customer_email) =
        request.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Return request not found"))?;
    let mut refunded_amount = 0_i64;
    let next_status = match payload.action.as_str() {
        "approve" if current_status == "requested" => {
            sqlx::query("UPDATE return_requests SET status = 'approved' WHERE id = $1")
                .bind(return_id)
                .execute(&mut *tx)
                .await
                .map_err(|_| ApiError::internal())?;
            "approved"
        }
        "reject" if current_status == "requested" => {
            let reason = payload.refusal_reason.as_deref().map(str::trim).unwrap_or("");
            if reason.is_empty() || reason.chars().count() > 2_000 {
                return Err(ApiError::new(StatusCode::BAD_REQUEST, "A refusal reason is required"));
            }
            sqlx::query(
                "UPDATE return_requests
                 SET status = 'rejected', refusal_reason = $2
                 WHERE id = $1",
            )
            .bind(return_id)
            .bind(reason)
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
            "rejected"
        }
        "receive" if current_status == "approved" => {
            let restock = payload.restock.unwrap_or(false);
            let lines: Vec<(i64, i64, i32, i32, i64, bool)> = sqlx::query_as(
                "SELECT rl.order_line_id, ol.product_id, rl.quantity, ol.quantity,
                        ol.total_incl_tax, p.stock_tracked
                 FROM return_lines rl
                 JOIN order_lines ol ON ol.id = rl.order_line_id
                 JOIN products p ON p.id = ol.product_id
                 WHERE rl.return_request_id = $1 AND ol.is_shipping = false
                 ORDER BY ol.product_id FOR UPDATE OF rl, ol, p",
            )
            .bind(return_id)
            .fetch_all(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
            if lines.is_empty() {
                return Err(ApiError::new(StatusCode::CONFLICT, "Return request contains no products"));
            }
            for (order_line_id, product_id, return_quantity, ordered_quantity, line_total, stock_tracked) in lines {
                if return_quantity <= 0 || ordered_quantity <= 0 || return_quantity > ordered_quantity {
                    return Err(ApiError::internal());
                }
                let refund = as_i64(
                    (i128::from(line_total) * i128::from(return_quantity)
                        + i128::from(ordered_quantity) / 2)
                        / i128::from(ordered_quantity),
                )?;
                refunded_amount = refunded_amount
                    .checked_add(refund)
                    .ok_or_else(ApiError::internal)?;
                if restock && stock_tracked {
                    let updated: Option<i32> = sqlx::query_scalar(
                        "UPDATE stock_levels
                         SET quantity_on_hand = quantity_on_hand + $2
                         WHERE product_id = $1
                         RETURNING quantity_on_hand",
                    )
                    .bind(product_id)
                    .bind(return_quantity)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|_| ApiError::internal())?;
                    if updated.is_none() {
                        return Err(ApiError::new(StatusCode::CONFLICT, "Stock level is missing for returned product"));
                    }
                    sqlx::query(
                        "INSERT INTO stock_moves (product_id, quantity, move_type, order_id, return_request_id, actor)
                         VALUES ($1, $2, 'return_receipt', $3, $4, $5)",
                    )
                    .bind(product_id)
                    .bind(return_quantity)
                    .bind(order_id)
                    .bind(return_id)
                    .bind(format!("admin:{admin}"))
                    .execute(&mut *tx)
                    .await
                    .map_err(|_| ApiError::internal())?;
                }
                sqlx::query("UPDATE return_lines SET restock = $2 WHERE return_request_id = $1 AND order_line_id = $3")
                    .bind(return_id)
                    .bind(restock && stock_tracked)
                    .bind(order_line_id)
                    .execute(&mut *tx)
                    .await
                    .map_err(|_| ApiError::internal())?;
            }
            if refunded_amount > 0 {
                MockPaymentProvider {
                    scenario: MockScenario::Success,
                }
                .refund(refunded_amount)
                .map_err(|_| ApiError::new(StatusCode::UNPROCESSABLE_ENTITY, "Mock refund request is invalid"))?;
                let payment: Option<(i64, i64, i64)> = sqlx::query_as(
                    "SELECT id, provider_id, amount FROM payment_transactions
                     WHERE order_id = $1 AND operation = 'payment' AND status = 'done'
                     ORDER BY id LIMIT 1 FOR UPDATE",
                )
                .bind(order_id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|_| ApiError::internal())?;
                let (payment_id, provider_id, paid_amount) = payment.ok_or_else(|| {
                    ApiError::new(StatusCode::CONFLICT, "A completed payment is required to refund this order")
                })?;
                let refunded_so_far: i64 = sqlx::query_scalar(
                    "SELECT COALESCE(-SUM(amount), 0)::BIGINT
                     FROM payment_transactions
                     WHERE order_id = $1 AND operation = 'refund' AND status = 'done'",
                )
                .bind(order_id)
                .fetch_one(&mut *tx)
                .await
                .map_err(|_| ApiError::internal())?;
                let total_refunded = refunded_so_far
                    .checked_add(refunded_amount)
                    .ok_or_else(ApiError::internal)?;
                if total_refunded > paid_amount {
                    return Err(ApiError::new(StatusCode::CONFLICT, "Refund exceeds the captured payment"));
                }
                let reference = opaque_reference("mock-refund-")?;
                sqlx::query(
                    "INSERT INTO payment_transactions (
                        order_id, provider_id, parent_id, reference, operation, amount,
                        currency, status, status_message, last_state_change
                     )
                     SELECT $1, $2, $3, $4, 'refund', -$5, currency, 'done',
                            'Deterministic mock refund succeeded', CURRENT_TIMESTAMP
                     FROM payment_transactions WHERE id = $3",
                )
                .bind(order_id)
                .bind(provider_id)
                .bind(payment_id)
                .bind(reference)
                .bind(refunded_amount)
                .execute(&mut *tx)
                .await
                .map_err(|_| ApiError::internal())?;
                let payment_status = if total_refunded == paid_amount {
                    "refunded"
                } else {
                    "partially_refunded"
                };
                sqlx::query("UPDATE orders SET payment_status = $2 WHERE id = $1")
                    .bind(order_id)
                    .bind(payment_status)
                    .execute(&mut *tx)
                    .await
                    .map_err(|_| ApiError::internal())?;
            }
            sqlx::query(
                "UPDATE return_requests
                 SET status = 'closed', received_at = CURRENT_TIMESTAMP, closed_at = CURRENT_TIMESTAMP
                 WHERE id = $1",
            )
            .bind(return_id)
            .execute(&mut *tx)
            .await
            .map_err(|_| ApiError::internal())?;
            "closed"
        }
        _ => return Err(ApiError::new(StatusCode::CONFLICT, "Invalid return status transition")),
    };
    if next_status == "closed" {
        sqlx::query(
            "INSERT INTO notifications (template_key, recipient_email, channel, status, order_id)
             VALUES ('return_closed', $1, 'email', 'pending', $2)",
        )
        .bind(customer_email)
        .bind(order_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| ApiError::internal())?;
    }
    sqlx::query(
        "INSERT INTO audit_logs (entity_type, entity_id, event, actor, diff)
         VALUES ('return_request', $1, $2, $3, $4)",
    )
    .bind(return_id)
    .bind(format!("return.{next_status}"))
    .bind(format!("admin:{admin}"))
    .bind(SqlJson(json!({
        "from": current_status,
        "to": next_status,
        "order_id": order_id,
        "refunded_amount": refunded_amount
    })))
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal())?;
    tx.commit().await.map_err(|_| ApiError::internal())?;
    Ok(Json(ReturnProcessingResponse {
        id: return_id,
        status: next_status.to_owned(),
        refunded_amount,
    }))
}

pub fn router() -> Router<PgPool> {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/products", get(public_products))
        .route("/api/products/:product_id", get(public_product))
        .route("/api/categories", get(public_categories))
        .route("/api/shipping-methods", get(public_shipping_methods))
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(customer_login))
        .route("/api/admin/login", post(admin_login))
        .route(
            "/api/customer/addresses",
            get(customer_addresses).post(create_customer_address),
        )
        .route(
            "/api/customer/addresses/:address_id",
            put(update_customer_address).delete(delete_customer_address),
        )
        .route("/api/cart", get(get_cart).post(create_cart))
        .route("/api/cart/items", get(get_cart_items).post(add_cart_item))
        .route("/api/cart/items/:product_id", patch(update_cart_item).delete(delete_cart_item))
        .route("/api/orders/checkout", post(checkout))
        .route("/api/customer/orders", get(customer_orders))
        .route("/api/customer/orders/:reference/returns", post(request_return))
        .route("/api/admin/products", get(admin_products))
        .route("/api/admin/products/:product_id", patch(update_admin_product))
        .route("/api/admin/orders", get(admin_orders))
        .route("/api/admin/orders/:order_number/shipment", post(update_shipment))
        .route("/api/admin/returns", get(admin_returns))
        .route("/api/admin/returns/:return_id/process", post(process_return))
}
`;

export function generateEcommerceApiFiles(ctx: GenerationContext): GeneratedFile[] {
  if (
    ctx.spec.backend.language !== 'rust' ||
    !ctx.spec.database.enabled ||
    ctx.spec.database.type !== 'postgresql'
  ) {
    return [];
  }

  const content = API_SOURCE(ctx.spec.project.slug, ctx.spec.project.version).trimStart();
  return [
    {
      path: 'src/api.rs',
      content,
      language: 'rust',
      size: new TextEncoder().encode(content).length,
      brickId: 'ecom-cart-orders',
      brickName: 'E-commerce Cart and Orders API',
      brickVersion: '1.0.0',
      reason:
        'Generate e-commerce catalog, account, cart, checkout, order, return, and role-protected admin REST routes.',
    },
  ];
}
