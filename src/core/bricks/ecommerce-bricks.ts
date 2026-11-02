import { BrickDefinition, GeneratedFile, GenerationContext } from '../types';
import { getContentByteLength } from '../utils';
import { generateEcommerceApiFiles } from './ecommerce-api';
import { generateEcommerceFrontendFiles } from './ecommerce-frontend';

const brickVersion = '1.0.0';

function rustFile(
  brickId: string,
  brickName: string,
  path: string,
  content: string,
): GeneratedFile {
  return {
    path,
    content,
    language: 'rust',
    size: getContentByteLength(content),
    brickId,
    brickName,
    brickVersion,
    reason: `Code métier généré par la brique ${brickId}.`,
  };
}

function markdownFile(brickId: string, brickName: string, path: string, content: string): GeneratedFile {
  return {
    path,
    content,
    language: 'markdown',
    size: getContentByteLength(content),
    brickId,
    brickName,
    brickVersion,
    reason: `Guide du projet généré par la brique ${brickId}.`,
  };
}

function ecommerceBrick(
  id: string,
  name: string,
  description: string,
  provides: string[],
  requires: string[],
  templateFiles: string[],
  generateFiles: (ctx: GenerationContext) => GeneratedFile[],
  generateDecisions: BrickDefinition['generateDecisions'],
): BrickDefinition {
  return {
    id,
    name,
    category: 'backend',
    version: brickVersion,
    description,
    iconName: 'ShoppingBag',
    provides,
    requires,
    compatibleWith: ['rust-backend', 'react-vite', 'postgres-storage', 'rest-api', 'jwt-auth'],
    conflictsWith: [],
    options: [],
    templateFiles,
    tags: ['ecommerce', 'rust', 'postgresql'],
    generateFiles,
    generateDecisions,
  };
}

const catalogBrick = ecommerceBrick(
  'ecom-catalog',
  'E-commerce Product Catalog',
  'Catalogue, fiches produit, catégories et vitrine React.',
  ['ecommerce_catalog', 'ecommerce_frontend'],
  ['ui_client', 'sql_storage'],
  ['frontend/src/App.tsx', 'src/ecommerce/catalog.rs'],
  (ctx) => {
    const productVisibility = `pub fn is_visible(active: bool, sellable: bool, published: bool) -> bool {
    active && sellable && published
}

#[cfg(test)]
mod tests {
    use super::is_visible;

    #[test]
    fn only_active_sellable_published_products_are_visible() {
        assert!(is_visible(true, true, true));
        assert!(!is_visible(false, true, true));
        assert!(!is_visible(true, false, true));
        assert!(!is_visible(true, true, false));
    }
}
`;
    const frontendFiles = generateEcommerceFrontendFiles(ctx).map((file) => ({
      ...file,
      brickId: 'ecom-catalog',
      brickName: 'E-commerce Product Catalog',
      brickVersion,
    }));
    return [
      rustFile('ecom-catalog', 'E-commerce Product Catalog', 'src/ecommerce/catalog.rs', productVisibility),
      ...frontendFiles,
    ];
  },
  () => [{
    id: 'ADR-ECOM-CATALOG',
    title: 'Catalogue et navigation e-commerce',
    status: 'Accepted',
    context: 'La boutique v1 expose un catalogue simple sans variantes de produit.',
    decision: 'Un produit vendable porte un SKU, un prix et une traduction JSONB ; sa visibilité combine actif, vendable et publié.',
    consequences: ['Les variantes et les fonctions CMS restent hors du périmètre v1.'],
    generatingBrick: 'ecom-catalog',
  }],
);

const pricingBrick = ecommerceBrick(
  'ecom-pricing',
  'E-commerce Pricing and Taxes',
  'Prix en unités mineures, taxes entières et promotions.',
  ['ecommerce_pricing'],
  ['ecommerce_catalog', 'sql_storage'],
  ['src/ecommerce/pricing.rs'],
  (ctx) => [rustFile(
    'ecom-pricing',
    'E-commerce Pricing and Taxes',
    'src/ecommerce/pricing.rs',
    `pub fn tax_amount(amount_minor: i64, rate_bp: i32) -> Result<i64, &'static str> {
    if amount_minor < 0 || rate_bp < 0 {
        return Err("amount and tax rate must be non-negative");
    }
    amount_minor
        .checked_mul(i64::from(rate_bp))
        .and_then(|value| value.checked_add(5_000))
        .map(|value| value / 10_000)
        .ok_or("tax amount overflow")
}

pub fn apply_percent_discount(amount_minor: i64, discount_bp: i32) -> Result<i64, &'static str> {
    if amount_minor < 0 || !(0..=10_000).contains(&discount_bp) {
        return Err("invalid amount or discount rate");
    }
    amount_minor
        .checked_mul(i64::from(discount_bp))
        .and_then(|value| value.checked_add(5_000))
        .map(|value| value / 10_000)
        .ok_or("discount amount overflow")
}

#[cfg(test)]
mod tests {
    use super::{apply_percent_discount, tax_amount};

    #[test]
    fn calculates_tax_and_discount_in_minor_units() {
        assert_eq!(tax_amount(1_000, 2_000), Ok(200));
        assert_eq!(apply_percent_discount(1_000, 1_000), Ok(100));
        assert!(tax_amount(-1, 2_000).is_err());
        assert!(apply_percent_discount(i64::MAX, 10_000).is_err());
    }
}
`,
  )],
  () => [{
    id: 'ADR-ECOM-PRICING',
    title: 'Prix et fiscalité e-commerce',
    status: 'Accepted',
    context: 'Les montants doivent rester exacts et les commandes historiquement stables.',
    decision: 'Les prix et taxes utilisent des entiers en unités mineures ; les taux utilisent des points de base et les détails de commande sont figés.',
    consequences: ['Les calculs vérifient les débordements et n’emploient jamais de nombres flottants.'],
    generatingBrick: 'ecom-pricing',
  }],
);

const cartOrdersBrick = ecommerceBrick(
  'ecom-cart-orders',
  'E-commerce Cart and Orders',
  'Paniers clients, validation de commande et API de boutique.',
  ['ecommerce_cart_orders'],
  ['ecommerce_catalog', 'ecommerce_pricing', 'rest_server', 'jwt_authentication', 'sql_storage'],
  [
    'src/api.rs',
    'src/ecommerce/cart_orders.rs',
    'src/ecommerce/acceptance_tests.rs',
  ],
  (ctx) => {
    const statusModule = rustFile(
      'ecom-cart-orders',
      'E-commerce Cart and Orders',
      'src/ecommerce/cart_orders.rs',
      `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrderStatus {
    PendingPayment,
    Confirmed,
    Shipped,
    Delivered,
    Cancelled,
}

impl OrderStatus {
    pub fn can_transition_to(self, next: Self) -> bool {
        matches!(
            (self, next),
            (Self::PendingPayment, Self::Confirmed)
                | (Self::PendingPayment, Self::Cancelled)
                | (Self::Confirmed, Self::Shipped)
                | (Self::Confirmed, Self::Cancelled)
                | (Self::Shipped, Self::Delivered)
        )
    }
}

#[cfg(test)]
mod tests {
    use super::OrderStatus;

    #[test]
    fn enforces_order_transitions() {
        assert!(OrderStatus::PendingPayment.can_transition_to(OrderStatus::Confirmed));
        assert!(OrderStatus::Confirmed.can_transition_to(OrderStatus::Shipped));
        assert!(!OrderStatus::Delivered.can_transition_to(OrderStatus::Cancelled));
    }
}
`,
    );
    const apiFiles = generateEcommerceApiFiles(ctx).map((file) => ({
      ...file,
      brickId: 'ecom-cart-orders',
      brickName: 'E-commerce Cart and Orders',
      brickVersion,
    }));
    const acceptanceTests = rustFile(
      'ecom-cart-orders',
      'E-commerce Cart and Orders',
      'src/ecommerce/acceptance_tests.rs',
      `use axum::{
    body::Body,
          http::{Method, Request, StatusCode},
          response::Response,
          Router,
      };
use http_body_util::BodyExt;
use serde_json::{json, Value};
use sqlx::PgPool;
use std::{
    env,
    time::{SystemTime, UNIX_EPOCH},
};
use tower::ServiceExt;

async fn call(
    app: &Router,
    method: Method,
    path: &str,
    token: Option<&str>,
    cart_session: &str,
    payload: Option<Value>,
) -> Response {
    let mut request = Request::builder()
        .method(method)
        .uri(path)
        .header("x-cart-session", cart_session);
    if let Some(token) = token {
        request = request.header("authorization", format!("Bearer {token}"));
    }
    if payload.is_some() {
        request = request.header("content-type", "application/json");
    }
    let body = payload.map_or_else(String::new, |value| value.to_string());
    app.clone()
        .oneshot(request.body(Body::from(body)).expect("build HTTP request"))
        .await
        .expect("dispatch HTTP request")
}

async fn json_response(response: Response, expected: StatusCode) -> Value {
    let status = response.status();
    let body = response
        .into_body()
        .collect()
        .await
        .expect("read HTTP response")
        .to_bytes();
    assert_eq!(
        status,
        expected,
        "unexpected response body: {}",
        String::from_utf8_lossy(&body)
    );
    serde_json::from_slice(&body).expect("decode JSON response")
}

async fn pdf_response(response: Response) -> Vec<u8> {
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("content-type").and_then(|value| value.to_str().ok()),
        Some("application/pdf")
    );
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("read PDF response")
        .to_bytes();
    assert!(bytes.starts_with(b"%PDF-"), "response must contain a PDF");
    bytes.to_vec()
}

fn dashboard_currency_metrics(dashboard: &Value, currency: &str) -> (i64, i64, i64) {
    dashboard["sales_by_currency"]
        .as_array()
        .and_then(|rows| rows.iter().find(|row| row["currency"] == currency))
        .map(|row| (
            row["order_count"].as_i64().expect("currency order count"),
            row["sales_ttc"].as_i64().expect("currency sales"),
            row["average_order_value_ttc"].as_i64().expect("currency average"),
        ))
        .unwrap_or((0, 0, 0))
}

fn dashboard_refunded_amount(dashboard: &Value, currency: &str) -> i64 {
    dashboard["refunded_amounts_by_currency"]
        .as_array()
        .and_then(|rows| rows.iter().find(|row| row["currency"] == currency))
        .map(|row| row["refunded_amount"].as_i64().expect("refunded amount"))
        .unwrap_or(0)
}

async fn stock_quantity(pool: &PgPool, product_id: i64) -> i32 {
    sqlx::query_scalar(
        "SELECT quantity_on_hand FROM stock_levels WHERE product_id = $1",
    )
    .bind(product_id)
    .fetch_one(pool)
    .await
    .expect("read product stock")
}

#[tokio::test]
#[ignore = "requires an isolated PostgreSQL database ending in _test"]
async fn catalog_to_mock_refund_acceptance_flow() {
    assert_eq!(
        env::var("ECOMMERCE_ACCEPTANCE_TESTS").unwrap_or_default(),
        "1",
        "set ECOMMERCE_ACCEPTANCE_TESTS=1 to confirm use of a disposable test database"
    );
    let database_url =
        env::var("ECOMMERCE_TEST_DATABASE_URL").expect("set ECOMMERCE_TEST_DATABASE_URL");
    let database_path = database_url.split('?').next().unwrap_or(&database_url);
    let database_name = database_path.rsplit('/').next().unwrap_or_default();
    assert!(
        database_name.ends_with("_test"),
        "the test database name must end in _test"
    );
    let jwt_secret = env::var("JWT_SECRET").expect("set JWT_SECRET");
    assert!(jwt_secret.as_bytes().len() >= 32, "JWT_SECRET must be at least 32 bytes");
    let admin_email = env::var("ECOM_ADMIN_EMAIL").expect("set ECOM_ADMIN_EMAIL");
    let admin_password =
        env::var("ECOM_ADMIN_PASSWORD").expect("set ECOM_ADMIN_PASSWORD");
    assert!(admin_password.len() >= 12, "ECOM_ADMIN_PASSWORD must be at least 12 bytes");

    let pool = crate::db::init_database(&database_url)
        .await
        .expect("initialize disposable PostgreSQL database");
    crate::ecommerce::admin::bootstrap_admin(&pool)
        .await
        .expect("bootstrap test administrator");
    let app = crate::api::router().with_state(pool.clone());
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock")
        .as_nanos();
    let email = format!("acceptance-{nonce}@example.invalid");
    let cart_session = format!("acceptance-session-{nonce}");

    let products = json_response(
        call(&app, Method::GET, "/api/products", None, &cart_session, None).await,
        StatusCode::OK,
    )
    .await;
    let product = products
        .as_array()
        .and_then(|rows| rows.iter().find(|row| row["sku"] == "DEMO-001"))
        .expect("seeded DEMO-001 product");
    let product_id = product["id"].as_i64().expect("product id");
    let initial_stock = stock_quantity(&pool, product_id).await;
    assert!(initial_stock > 0, "demo product must have stock");

    let customer = json_response(
        call(
            &app,
            Method::POST,
            "/api/auth/register",
            None,
            &cart_session,
            Some(json!({
                "email": email,
                "password": "acceptance-password-2026",
                "first_name": "Test",
                "last_name": "Customer"
            })),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    let customer_token = customer["access_token"]
        .as_str()
        .expect("customer access token");

    let mut address_payload = json!({
        "address_type": "both",
        "recipient": "Test Customer",
        "street1": "1 rue de Test",
        "street2": null,
        "zip": "75001",
        "city": "Paris",
        "country": "FR",
        "region": null
    });
    let address = json_response(
        call(
            &app,
            Method::POST,
            "/api/customer/addresses",
            Some(customer_token),
            &cart_session,
            Some(address_payload.clone()),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    let address_id = address["id"].as_i64().expect("address id");
    let addresses = json_response(
        call(
            &app,
            Method::GET,
            "/api/customer/addresses",
            Some(customer_token),
            &cart_session,
            None,
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(addresses.as_array().map(Vec::len), Some(1));
    address_payload["street1"] = json!("2 rue de Test");
    let updated_address = json_response(
        call(
            &app,
            Method::PUT,
            &format!("/api/customer/addresses/{address_id}"),
            Some(customer_token),
            &cart_session,
            Some(address_payload.clone()),
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(updated_address["street1"], "2 rue de Test");

    let temporary_address = json_response(
        call(
            &app,
            Method::POST,
            "/api/customer/addresses",
            Some(customer_token),
            &cart_session,
            Some(json!({
                "address_type": "shipping",
                "recipient": "Temporary Customer",
                "street1": "3 rue de Test",
                "zip": "75002",
                "city": "Paris",
                "country": "FR"
            })),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    let delete_response = call(
        &app,
        Method::DELETE,
        &format!(
            "/api/customer/addresses/{}",
            temporary_address["id"].as_i64().expect("temporary address id")
        ),
        Some(customer_token),
        &cart_session,
        None,
    )
    .await;
    assert_eq!(delete_response.status(), StatusCode::NO_CONTENT);

    let shipping_methods = json_response(
        call(&app, Method::GET, "/api/shipping-methods", None, &cart_session, None).await,
        StatusCode::OK,
    )
    .await;
    let shipping_method_id = shipping_methods
        .as_array()
        .and_then(|rows| rows.first())
        .and_then(|row| row["id"].as_i64())
        .expect("seeded shipping method");
    let admin = json_response(
        call(
            &app,
            Method::POST,
            "/api/admin/login",
            None,
            &cart_session,
            Some(json!({"email": admin_email, "password": admin_password})),
        )
        .await,
        StatusCode::OK,
    )
    .await;
    let admin_token = admin["access_token"]
        .as_str()
        .expect("administrator access token");
    let dashboard_before_order = json_response(
        call(
            &app,
            Method::GET,
            "/api/admin/dashboard",
            Some(admin_token),
            &cart_session,
            None,
        )
        .await,
        StatusCode::OK,
    )
    .await;
    let cart = json_response(
        call(
            &app,
            Method::POST,
            "/api/cart/items",
            Some(customer_token),
            &cart_session,
            Some(json!({"product_id": product_id, "quantity": 1})),
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(cart["items"].as_array().map(Vec::len), Some(1));

    let checkout = json_response(
        call(
            &app,
            Method::POST,
            "/api/orders/checkout",
            Some(customer_token),
            &cart_session,
            Some(json!({
                "billing_address": address_payload,
                "shipping_address": address_payload,
                "shipping_method_id": shipping_method_id
            })),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    assert_eq!(checkout["status"], "confirmed");
    assert_eq!(checkout["payment_status"], "paid");
    let order_number = checkout["order_number"]
        .as_str()
        .expect("created order number");
    let dashboard_after_order = json_response(
        call(
            &app,
            Method::GET,
            "/api/admin/dashboard",
            Some(admin_token),
            &cart_session,
            None,
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(
        dashboard_after_order["order_count"].as_i64(),
        Some(dashboard_before_order["order_count"].as_i64().expect("baseline order count") + 1)
    );
    let currency = checkout["currency"].as_str().expect("checkout currency");
    let total = checkout["total"].as_i64().expect("checkout total");
    let (before_currency_orders, before_currency_sales, _) =
        dashboard_currency_metrics(&dashboard_before_order, currency);
    let (after_currency_orders, after_currency_sales, after_currency_average) =
        dashboard_currency_metrics(&dashboard_after_order, currency);
    assert_eq!(after_currency_orders, before_currency_orders + 1);
    assert_eq!(after_currency_sales, before_currency_sales + total);
    assert_eq!(
        after_currency_average,
        (before_currency_sales + total) / (before_currency_orders + 1),
        "average order value uses integer division per currency"
    );
    let customer_id: i64 = sqlx::query_scalar("SELECT id FROM customers WHERE email = $1")
        .bind(&email)
        .fetch_one(&pool)
        .await
        .expect("find acceptance customer");
    let usd_order_number = format!("ACCEPTANCE-USD-{nonce}");
    let usd_order_id: i64 = sqlx::query_scalar(
        "INSERT INTO orders (
            order_number, customer_id, status, payment_status, currency,
            subtotal_excl_tax, tax_total, shipping_total, discount_total, total,
            billing_address, shipping_address, access_token, placed_at, confirmed_at
         )
         VALUES ($1, $2, 'confirmed', 'paid', 'USD', 1000, 234, 0, 0, 1234,
                 '{}'::jsonb, '{}'::jsonb, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id",
    )
    .bind(&usd_order_number)
    .bind(customer_id)
    .bind(format!("acceptance-token-{nonce}"))
    .fetch_one(&pool)
    .await
    .expect("create second-currency order fixture");
    sqlx::query(
        "INSERT INTO order_lines (
            order_id, product_id, sku, name, quantity, unit_price_excl_tax,
            discount_excl_tax, tax_rate_bp, tax_amount, total_excl_tax,
            total_incl_tax, currency, is_shipping
         )
         SELECT $1, p.id, p.sku, p.name, 1, 1000, 0, 2340, 234, 1000,
                1234, 'USD', false
         FROM products p WHERE p.id = $2",
    )
    .bind(usd_order_id)
    .bind(product_id)
    .execute(&pool)
    .await
    .expect("create second-currency order line fixture");
    let dashboard_after_currency_fixture = json_response(
        call(
            &app,
            Method::GET,
            "/api/admin/dashboard",
            Some(admin_token),
            &cart_session,
            None,
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(
        dashboard_after_currency_fixture["order_count"].as_i64(),
        Some(dashboard_before_order["order_count"].as_i64().expect("baseline order count") + 2)
    );
    let (before_usd_orders, before_usd_sales, _) =
        dashboard_currency_metrics(&dashboard_after_order, "USD");
    let (after_usd_orders, after_usd_sales, after_usd_average) =
        dashboard_currency_metrics(&dashboard_after_currency_fixture, "USD");
    assert_eq!(after_usd_orders, before_usd_orders + 1);
    assert_eq!(after_usd_sales, before_usd_sales + 1234);
    assert_eq!(
        after_usd_average,
        (before_usd_sales + 1234) / (before_usd_orders + 1)
    );
    assert_eq!(
        dashboard_currency_metrics(&dashboard_after_currency_fixture, currency).1,
        after_currency_sales,
        "USD sales must not be added to the original currency"
    );

    let other_customer = json_response(
        call(
            &app,
            Method::POST,
            "/api/auth/register",
            None,
            &cart_session,
            Some(json!({
                "email": format!("other-{nonce}@example.invalid"),
                "password": "acceptance-password-2026",
                "first_name": "Other",
                "last_name": "Customer"
            })),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    let other_customer_token = other_customer["access_token"]
        .as_str()
        .expect("second customer access token");
    let foreign_document = call(
        &app,
        Method::GET,
        &format!("/api/customer/orders/{order_number}/documents/confirmation"),
        Some(other_customer_token),
        &cart_session,
        None,
    )
    .await;
    assert_eq!(foreign_document.status(), StatusCode::NOT_FOUND);
    let confirmation_pdf = pdf_response(
        call(
            &app,
            Method::GET,
            &format!("/api/customer/orders/{order_number}/documents/confirmation"),
            Some(customer_token),
            &cart_session,
            None,
        )
        .await,
    )
    .await;
    assert!(!confirmation_pdf.is_empty());
    let reserved: i32 = sqlx::query_scalar(
        "SELECT quantity_reserved FROM stock_levels WHERE product_id = $1",
    )
    .bind(product_id)
    .fetch_one(&pool)
    .await
    .expect("read reserved stock");
    assert!(reserved > 0, "checkout must reserve inventory");

    for status in ["ready", "shipped", "delivered"] {
        json_response(
            call(
                &app,
                Method::POST,
                &format!("/api/admin/orders/{order_number}/shipment"),
                Some(admin_token),
                &cart_session,
                Some(json!({"status": status})),
            )
            .await,
            StatusCode::OK,
        )
        .await;
    }
    let delivery_pdf = pdf_response(
        call(
            &app,
            Method::GET,
            &format!("/api/admin/orders/{order_number}/documents/delivery"),
            Some(admin_token),
            &cart_session,
            None,
        )
        .await,
    )
    .await;
    assert!(!delivery_pdf.is_empty());
    assert_eq!(stock_quantity(&pool, product_id).await, initial_stock - 1);
    let return_request = json_response(
        call(
            &app,
            Method::POST,
            &format!("/api/customer/orders/{order_number}/returns"),
            Some(customer_token),
            &cart_session,
            Some(json!({"reason": "Acceptance test return"})),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    let return_id = return_request["id"].as_i64().expect("return request id");
    for (action, restock) in [("approve", false), ("receive", true)] {
        json_response(
            call(
                &app,
                Method::POST,
                &format!("/api/admin/returns/{return_id}/process"),
                Some(admin_token),
                &cart_session,
                Some(json!({"action": action, "restock": restock})),
            )
            .await,
            StatusCode::OK,
        )
        .await;
    }
    assert_eq!(stock_quantity(&pool, product_id).await, initial_stock);
    let refund_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM payment_transactions
         WHERE operation = 'refund' AND status = 'done'
           AND order_id = (SELECT id FROM orders WHERE order_number = $1)",
    )
    .bind(order_number)
    .fetch_one(&pool)
    .await
    .expect("verify mock refund");
    assert_eq!(refund_count, 1, "return processing must record one mock refund");

    let order_refunded_amount: i64 = sqlx::query_scalar(
        "SELECT COALESCE(-SUM(amount), 0)::BIGINT
         FROM payment_transactions
         WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)
           AND operation = 'refund' AND status = 'done'",
    )
    .bind(order_number)
    .fetch_one(&pool)
    .await
    .expect("read order refund total");
    let dashboard_after_refund = json_response(
        call(
            &app,
            Method::GET,
            "/api/admin/dashboard",
            Some(admin_token),
            &cart_session,
            None,
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(
        dashboard_after_refund["closed_return_count"].as_i64(),
        Some(dashboard_after_currency_fixture["closed_return_count"].as_i64().expect("baseline closed returns") + 1)
    );
    assert_eq!(
        dashboard_after_refund["successful_refund_count"].as_i64(),
        Some(dashboard_after_currency_fixture["successful_refund_count"].as_i64().expect("baseline refund count") + 1)
    );
    assert_eq!(
        dashboard_refunded_amount(&dashboard_after_refund, currency),
        dashboard_refunded_amount(&dashboard_after_currency_fixture, currency) + order_refunded_amount
    );

    let refund_pdf = pdf_response(
        call(
            &app,
            Method::GET,
            &format!("/api/customer/returns/{return_id}/documents/refund"),
            Some(customer_token),
            &cart_session,
            None,
        )
        .await,
    )
    .await;
    assert!(!refund_pdf.is_empty());
    let foreign_return_document = call(
        &app,
        Method::GET,
        &format!("/api/customer/returns/{return_id}/documents/refund"),
        Some(other_customer_token),
        &cart_session,
        None,
    )
    .await;
    assert_eq!(foreign_return_document.status(), StatusCode::NOT_FOUND);

    let page_slug = format!("acceptance-{nonce}");
    let page_payload = json!({
        "slug": page_slug,
        "title": {"fr": "Page d'acceptation"},
        "body": {"fr": "Contenu de test"},
        "status": "published",
        "publish_at": null,
        "is_indexable": false
    });
    let page = json_response(
        call(
            &app,
            Method::POST,
            "/api/admin/content/pages",
            Some(admin_token),
            &cart_session,
            Some(page_payload),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    let page_id = page["id"].as_i64().expect("created content page id");
    let published_page = json_response(
        call(
            &app,
            Method::GET,
            &format!("/api/content/pages/{page_slug}"),
            None,
            &cart_session,
            None,
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(published_page["body"]["fr"], "Contenu de test");
    let duplicate_page = json_response(
        call(
            &app,
            Method::POST,
            &format!("/api/admin/content/pages/{page_id}/duplicate"),
            Some(admin_token),
            &cart_session,
            None,
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    assert_eq!(duplicate_page["status"], "draft");
    for id in [
        page_id,
        duplicate_page["id"].as_i64().expect("duplicated page id"),
    ] {
        let response = call(
            &app,
            Method::DELETE,
            &format!("/api/admin/content/pages/{id}"),
            Some(admin_token),
            &cart_session,
            None,
        )
        .await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);
    }

    let abandoned_cart_id: i64 = sqlx::query_scalar(
        "INSERT INTO carts (customer_id, status, currency, updated_at)
         VALUES ($1, 'open', $2, CURRENT_TIMESTAMP - INTERVAL '11 hours')
         RETURNING id",
    )
    .bind(customer_id)
    .bind(currency)
    .fetch_one(&pool)
    .await
    .expect("create abandoned cart fixture");
    let cart_line = sqlx::query(
        "INSERT INTO cart_lines (cart_id, product_id, quantity, unit_price, currency, tax_rate_bp)
         SELECT $1, p.id, 1, p.price_catalog, p.currency, t.rate_bp
         FROM products p JOIN tax_rates t ON t.id = p.tax_rate_id
         WHERE p.id = $2",
    )
    .bind(abandoned_cart_id)
    .bind(product_id)
    .execute(&pool)
    .await
    .expect("add abandoned cart fixture line");
    assert_eq!(cart_line.rows_affected(), 1);
    let queued = json_response(
        call(
            &app,
            Method::POST,
            &format!("/api/admin/carts/{abandoned_cart_id}/recovery"),
            Some(admin_token),
            &cart_session,
            None,
        )
        .await,
        StatusCode::OK,
    )
    .await;
    assert_eq!(queued["status"], "queued");
    let duplicate_queue = call(
        &app,
        Method::POST,
        &format!("/api/admin/carts/{abandoned_cart_id}/recovery"),
        Some(admin_token),
        &cart_session,
        None,
    )
    .await;
    assert_eq!(duplicate_queue.status(), StatusCode::CONFLICT);
    let notification_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notifications
         WHERE cart_id = $1 AND template_key = 'cart_recovery' AND status = 'pending'",
    )
    .bind(abandoned_cart_id)
    .fetch_one(&pool)
    .await
    .expect("verify queued notification");
    assert_eq!(notification_count, 1, "cart recovery queue is idempotent");
    pool.close().await;
}
`,
    );
    return [statusModule, ...apiFiles, acceptanceTests];
  },
  () => [{
    id: 'ADR-ECOM-CART-ORDERS',
    title: 'Paniers et commandes e-commerce',
    status: 'Accepted',
    context: 'Le panier est mutable tandis que la commande est un instantané comptable.',
    decision: 'La caisse recalcule et fige les lignes de commande, puis ne confirme que lorsque le paiement mock aboutit.',
    consequences: ['Les états de commande restent séparés des états de paiement et de livraison.'],
    generatingBrick: 'ecom-cart-orders',
  }],
);

const accountsBrick = ecommerceBrick(
  'ecom-accounts',
  'E-commerce Customer Accounts',
  'Comptes client, rôles fixes et règles d’accès.',
  ['ecommerce_accounts'],
  ['jwt_authentication', 'sql_storage'],
  ['src/ecommerce/accounts.rs'],
  (ctx) => [rustFile(
    'ecom-accounts',
    'E-commerce Customer Accounts',
    'src/ecommerce/accounts.rs',
    `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AdminRole {
    Manager,
    Operator,
    Editor,
}

impl AdminRole {
    pub fn from_str(role: &str) -> Option<Self> {
        match role {
            "manager" => Some(Self::Manager),
            "operator" => Some(Self::Operator),
            "editor" => Some(Self::Editor),
            _ => None,
        }
    }

    pub fn may_manage_settings(self) -> bool {
        self == Self::Manager
    }

    pub fn may_manage_prices(self) -> bool {
        matches!(self, Self::Manager | Self::Operator)
    }

    pub fn may_manage_inventory(self) -> bool {
        matches!(self, Self::Manager | Self::Operator)
    }
}

#[cfg(test)]
mod tests {
    use super::AdminRole;

    #[test]
    fn applies_fixed_admin_permissions() {
        assert!(AdminRole::Manager.may_manage_settings());
        assert!(!AdminRole::Editor.may_manage_prices());
        assert!(!AdminRole::Editor.may_manage_inventory());
        assert!(AdminRole::Operator.may_manage_prices());
        assert!(AdminRole::Operator.may_manage_inventory());
        assert!(AdminRole::from_str("operator").is_some());
        assert!(AdminRole::from_str("owner").is_none());
    }
}
`,
  )],
  () => [{
    id: 'ADR-ECOM-ACCOUNTS',
    title: 'Comptes et rôles e-commerce',
    status: 'Accepted',
    context: 'Les commandes v1 sont rattachées à un compte client et l’administration est protégée.',
    decision: 'Les clients utilisent JWT ; les trois rôles administratifs sont explicites et limités au serveur.',
    consequences: ['Le modèle de permissions reste fixe en v1, sans registry générique.'],
    generatingBrick: 'ecom-accounts',
  }],
);

const paymentBrick = ecommerceBrick(
  'ecom-payment-mock',
  'E-commerce Mock Payment Provider',
  'Contrat PaymentProvider et fournisseur mock sans appels externes.',
  ['ecommerce_payment_provider'],
  ['ecommerce_cart_orders', 'sql_storage'],
  ['src/ecommerce/payment.rs'],
  (ctx) => [rustFile(
    'ecom-payment-mock',
    'E-commerce Mock Payment Provider',
    'src/ecommerce/payment.rs',
    `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MockScenario {
    Success,
    Failure,
    Pending,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PaymentOutcome {
    Authorized,
    Captured,
    Refunded,
    Failed,
    Pending,
}

pub trait PaymentProvider {
    fn authorize(&self, amount_minor: i64, currency: &str) -> Result<PaymentOutcome, &'static str>;
    fn capture(&self, authorization: &PaymentOutcome) -> Result<PaymentOutcome, &'static str>;
    fn refund(&self, amount_minor: i64) -> Result<PaymentOutcome, &'static str>;
}

pub struct MockPaymentProvider {
    pub scenario: MockScenario,
}

impl PaymentProvider for MockPaymentProvider {
    fn authorize(&self, amount_minor: i64, currency: &str) -> Result<PaymentOutcome, &'static str> {
        if amount_minor < 0 || currency.len() != 3 {
            return Err("invalid amount or currency");
        }
        Ok(match self.scenario {
            MockScenario::Success => PaymentOutcome::Authorized,
            MockScenario::Failure => PaymentOutcome::Failed,
            MockScenario::Pending => PaymentOutcome::Pending,
        })
    }

    fn capture(&self, authorization: &PaymentOutcome) -> Result<PaymentOutcome, &'static str> {
        match authorization {
            PaymentOutcome::Authorized => Ok(PaymentOutcome::Captured),
            _ => Err("only authorized payments may be captured"),
        }
    }

    fn refund(&self, amount_minor: i64) -> Result<PaymentOutcome, &'static str> {
        if amount_minor <= 0 {
            return Err("refund must be positive");
        }
        Ok(PaymentOutcome::Refunded)
    }
}

#[cfg(test)]
mod tests {
    use super::{MockPaymentProvider, MockScenario, PaymentOutcome, PaymentProvider};

    #[test]
    fn mock_payment_is_deterministic_and_has_no_network_dependency() {
        let provider = MockPaymentProvider { scenario: MockScenario::Success };
        let authorization = provider.authorize(1_500, "EUR").unwrap();
        assert_eq!(authorization, PaymentOutcome::Authorized);
        assert_eq!(provider.capture(&authorization), Ok(PaymentOutcome::Captured));
        assert!(provider.authorize(-1, "EUR").is_err());
    }
}
`,
  )],
  () => [{
    id: 'ADR-ECOM-PAYMENT',
    title: 'Paiement mock e-commerce',
    status: 'Accepted',
    context: 'Le parcours de commande doit être testable sans PSP ni accès réseau.',
    decision: 'Le contrat PaymentProvider est fourni avec un mock déterministe configuré par scénario.',
    consequences: ['Les PSP réels restent reportés en v2 ; le mock ne collecte aucune donnée de carte.'],
    generatingBrick: 'ecom-payment-mock',
  }],
);

const inventoryBrick = ecommerceBrick(
  'ecom-inventory-fulfillment',
  'E-commerce Inventory and Fulfillment',
  'Réservation de stock, expédition et cycle de retour.',
  ['ecommerce_inventory_fulfillment'],
  ['ecommerce_cart_orders', 'sql_storage'],
  ['src/ecommerce/inventory.rs'],
  (ctx) => [rustFile(
    'ecom-inventory-fulfillment',
    'E-commerce Inventory and Fulfillment',
    'src/ecommerce/inventory.rs',
    `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct StockLevel {
    pub quantity_on_hand: i32,
    pub quantity_reserved: i32,
}

impl StockLevel {
    pub fn available(self) -> Result<i32, &'static str> {
        if self.quantity_on_hand < 0
            || self.quantity_reserved < 0
            || self.quantity_reserved > self.quantity_on_hand
        {
            return Err("invalid stock level");
        }
        Ok(self.quantity_on_hand - self.quantity_reserved)
    }

    pub fn reserve(&mut self, quantity: i32) -> Result<(), &'static str> {
        if quantity <= 0 || quantity > self.available()? {
            return Err("insufficient available stock");
        }
        self.quantity_reserved += quantity;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::StockLevel;

    #[test]
    fn reserves_only_available_stock() {
        let mut stock = StockLevel { quantity_on_hand: 5, quantity_reserved: 2 };
        assert_eq!(stock.available(), Ok(3));
        assert!(stock.reserve(4).is_err());
        assert!(stock.reserve(3).is_ok());
        assert_eq!(stock.available(), Ok(0));
    }
}
`,
  )],
  () => [{
    id: 'ADR-ECOM-INVENTORY',
    title: 'Stock et livraison e-commerce',
    status: 'Accepted',
    context: 'Le stock doit être réservé au paiement, sans réservation au panier.',
    decision: 'La disponibilité est calculée en entiers et la réservation est effectuée dans la transaction de confirmation.',
    consequences: ['Une seule expédition par commande est prévue en v1.'],
    generatingBrick: 'ecom-inventory-fulfillment',
  }],
);

const notificationsBrick = ecommerceBrick(
  'ecom-notifications',
  'E-commerce Notifications',
  'Notifications transactionnelles email et suivi des envois.',
  ['ecommerce_notifications'],
  ['ecommerce_cart_orders', 'sql_storage'],
  ['src/ecommerce/notifications.rs'],
  (ctx) => [rustFile(
    'ecom-notifications',
    'E-commerce Notifications',
    'src/ecommerce/notifications.rs',
    `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NotificationEvent {
    OrderConfirmed,
    PaymentReceived,
    AccountCreated,
    PasswordReset,
    CartRecovery,
}

impl NotificationEvent {
    pub fn template_key(self) -> &'static str {
        match self {
            Self::OrderConfirmed => "order_confirmed",
            Self::PaymentReceived => "payment_received",
            Self::AccountCreated => "account_created",
            Self::PasswordReset => "password_reset",
            Self::CartRecovery => "cart_recovery",
        }
    }
}
`,
  )],
  () => [{
    id: 'ADR-ECOM-NOTIFICATIONS',
    title: 'Notifications e-commerce',
    status: 'Accepted',
    context: 'Les événements métier doivent pouvoir être suivis sans service externe en v1.',
    decision: 'Les notifications email sont enregistrées en base avec des clés de modèle déterministes.',
    consequences: ['L’envoi réel peut être branché ultérieurement sans modifier les événements métier.'],
    generatingBrick: 'ecom-notifications',
  }],
);

const auditOpsBrick = ecommerceBrick(
  'ecom-audit-ops',
  'E-commerce Audit and Operations',
  'Journal métier append-only et paramètres des tâches applicatives.',
  ['ecommerce_audit_ops'],
  ['sql_storage'],
  ['src/ecommerce/audit_ops.rs'],
  (ctx) => [rustFile(
    'ecom-audit-ops',
    'E-commerce Audit and Operations',
    'src/ecommerce/audit_ops.rs',
    `use sqlx::PgPool;
use std::{
    error::Error,
    io,
    time::Duration,
};

const CART_RECOVERY_BATCH_LIMIT: i64 = 100;

fn invalid_setting(message: &'static str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message)
}

fn parse_interval_minutes(value: &str) -> Result<Duration, io::Error> {
    let minutes = value.parse::<u64>()
        .map_err(|_| invalid_setting("tasks.cart_recovery_interval_minutes must be an integer"))?;
    if !(1..=1440).contains(&minutes) {
        return Err(invalid_setting(
            "tasks.cart_recovery_interval_minutes must be between 1 and 1440",
        ));
    }
    Ok(Duration::from_secs(minutes * 60))
}

fn parse_abandon_delay_hours(value: &str) -> Result<f64, io::Error> {
    let hours = value.parse::<u64>()
        .map_err(|_| invalid_setting("shop.cart_abandon_delay_hours must be an integer"))?;
    if !(1..=720).contains(&hours) {
        return Err(invalid_setting(
            "shop.cart_abandon_delay_hours must be between 1 and 720",
        ));
    }
    Ok(hours as f64)
}

async fn setting_value(pool: &PgPool, key: &str) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar("SELECT value #>> '{}' FROM settings WHERE key = $1")
        .bind(key)
        .fetch_optional(pool)
        .await
}

pub async fn queue_abandoned_cart_notifications(
    pool: &PgPool,
) -> Result<u64, Box<dyn Error + Send + Sync>> {
    let enabled = setting_value(pool, "tasks.cart_recovery_enabled")
        .await?
        .ok_or_else(|| invalid_setting("tasks.cart_recovery_enabled is not configured"))?
        .parse::<bool>()?;
    if !enabled {
        return Ok(0);
    }

    let delay_hours = setting_value(pool, "shop.cart_abandon_delay_hours")
        .await?
        .ok_or_else(|| invalid_setting("shop.cart_abandon_delay_hours is not configured"))?;
    let delay_hours = parse_abandon_delay_hours(&delay_hours)?;
    let result = sqlx::query(
        "WITH eligible AS (
             SELECT c.id, cu.email, cu.locale
             FROM carts c
             JOIN customers cu ON cu.id = c.customer_id AND cu.is_active = true
             WHERE c.status = 'open'
               AND c.recovery_notification_queued = false
               AND c.updated_at <= CURRENT_TIMESTAMP - ($1 * INTERVAL '1 hour')
               AND EXISTS (SELECT 1 FROM cart_lines cl WHERE cl.cart_id = c.id)
               AND EXISTS (
                   SELECT 1 FROM notification_templates nt
                   WHERE nt.key = 'cart_recovery'
                     AND nt.locale IN (cu.locale, 'fr')
                     AND nt.is_active = true
               )
             ORDER BY c.updated_at, c.id
             LIMIT $2
             FOR UPDATE OF c SKIP LOCKED
         ),
         queued AS (
             INSERT INTO notifications (cart_id, template_key, recipient_email, channel, status)
             SELECT id, 'cart_recovery', email, 'email', 'pending'
             FROM eligible
             ON CONFLICT (cart_id, template_key)
                 WHERE cart_id IS NOT NULL AND template_key = 'cart_recovery'
             DO NOTHING
             RETURNING cart_id
         )
         UPDATE carts c
         SET recovery_notification_queued = true, updated_at = CURRENT_TIMESTAMP
         FROM queued q
         WHERE c.id = q.cart_id",
    )
    .bind(delay_hours)
    .bind(CART_RECOVERY_BATCH_LIMIT)
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}

pub async fn run_cart_recovery_worker(pool: PgPool) {
    loop {
        let interval = match setting_value(&pool, "tasks.cart_recovery_interval_minutes").await {
            Ok(Some(value)) => match parse_interval_minutes(&value) {
                Ok(interval) => interval,
                Err(error) => {
                    tracing::error!(%error, "Cart recovery task configuration is invalid");
                    tokio::time::sleep(Duration::from_secs(60)).await;
                    continue;
                }
            },
            Ok(None) => {
                tracing::error!("tasks.cart_recovery_interval_minutes is not configured");
                tokio::time::sleep(Duration::from_secs(60)).await;
                continue;
            }
            Err(error) => {
                tracing::error!(%error, "Could not read cart recovery task configuration");
                tokio::time::sleep(Duration::from_secs(60)).await;
                continue;
            }
        };

        tokio::time::sleep(interval).await;
        match queue_abandoned_cart_notifications(&pool).await {
            Ok(0) => {}
            Ok(queued) => tracing::info!(queued, "Queued cart recovery notifications"),
            Err(error) => tracing::error!(%error, "Cart recovery task failed"),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuditEvent<'a> {
    pub entity_type: &'a str,
    pub entity_id: i64,
    pub event: &'a str,
    pub actor: &'a str,
}

impl<'a> AuditEvent<'a> {
    pub fn is_valid(&self) -> bool {
        !self.entity_type.is_empty()
            && self.entity_id > 0
            && !self.event.is_empty()
            && !self.actor.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_abandon_delay_hours, parse_interval_minutes};
    use std::time::Duration;

    #[test]
    fn validates_cart_recovery_schedule_settings() {
        assert_eq!(parse_interval_minutes("60").unwrap(), Duration::from_secs(3600));
        assert_eq!(parse_abandon_delay_hours("10").unwrap(), 10.0);
        assert!(parse_interval_minutes("0").is_err());
        assert!(parse_interval_minutes("1441").is_err());
        assert!(parse_abandon_delay_hours("-1").is_err());
    }
}
`,
  )],
  () => [{
    id: 'ADR-ECOM-AUDIT-OPS',
    title: 'Journalisation et exploitation e-commerce',
    status: 'Accepted',
    context: 'Les transitions comptables doivent être traçables sans exposer de données personnelles.',
    decision: 'Les événements métier sont enregistrés séparément des logs techniques et les tâches planifiées restent applicatives.',
    consequences: ['Le journal métier est append-only et les paramètres sont stockés en JSONB.'],
    generatingBrick: 'ecom-audit-ops',
  }],
);

const adminBrick = ecommerceBrick(
  'ecom-admin',
  'E-commerce Administration',
  'Administration minimale du catalogue, des commandes et des paramètres.',
  ['ecommerce_admin'],
  ['ecommerce_accounts', 'ecommerce_catalog', 'rest_server', 'sql_storage'],
  ['src/ecommerce/admin.rs', 'src/ecommerce/mod.rs', 'ECOMMERCE.md'],
  (ctx) => [
    rustFile(
      'ecom-admin',
      'E-commerce Administration',
      'src/ecommerce/admin.rs',
      `pub fn can_access_admin(role: &str) -> bool {
    matches!(role, "manager" | "operator" | "editor")
}

pub fn can_edit_catalog(role: &str) -> bool {
    can_access_admin(role)
}

pub fn can_edit_prices(role: &str) -> bool {
    matches!(role, "manager" | "operator")
}

pub fn can_manage_settings(role: &str) -> bool {
    role == "manager"
}

pub async fn bootstrap_admin(pool: &sqlx::PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let existing: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM admin_users")
        .fetch_one(pool)
        .await?;
    if existing > 0 {
        return Ok(());
    }

    let email = std::env::var("ECOM_ADMIN_EMAIL").ok().filter(|value| !value.trim().is_empty());
    let password = std::env::var("ECOM_ADMIN_PASSWORD").ok().filter(|value| !value.is_empty());
    let (Some(email), Some(password)) = (email, password) else {
        if std::env::var_os("ECOM_ADMIN_EMAIL").is_some()
            || std::env::var_os("ECOM_ADMIN_PASSWORD").is_some()
        {
            return Err("Set both ECOM_ADMIN_EMAIL and ECOM_ADMIN_PASSWORD to bootstrap the first admin.".into());
        }
        return Ok(());
    };
    if password.len() < 12 {
        return Err("ECOM_ADMIN_PASSWORD must contain at least 12 characters.".into());
    }

    use argon2::password_hash::{rand_core::OsRng, SaltString};
    use argon2::PasswordHasher;
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = argon2::Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|error| {
            std::io::Error::new(std::io::ErrorKind::Other, error.to_string())
        })?
        .to_string();

    sqlx::query(
        "INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'manager')"
    )
    .bind(email)
    .bind(password_hash)
    .execute(pool)
    .await?;
    Ok(())
}
`,
    ),
    rustFile(
      'ecom-admin',
      'E-commerce Administration',
      'src/ecommerce/mod.rs',
      `pub mod accounts;
pub mod admin;
pub mod audit_ops;
pub mod cart_orders;
pub mod catalog;
pub mod inventory;
pub mod notifications;
pub mod payment;
pub mod pricing;
#[cfg(test)]
mod acceptance_tests;
`,
    ),
    markdownFile(
      'ecom-admin',
      'E-commerce Administration',
      'ECOMMERCE.md',
      `# ${ctx.spec.project.name} — guide e-commerce

## Configuration

Copiez \`.env.example\` vers \`.env\`, puis définissez une valeur secrète aléatoire d’au moins 32 octets pour \`JWT_SECRET\` et un mot de passe PostgreSQL robuste composé de caractères compatibles URL (par exemple, une valeur hexadécimale) dans \`POSTGRES_PASSWORD\`. Compose assemble \`DATABASE_URL\` depuis les variables PostgreSQL ; n’utilisez pas de caractères comme \`@\`, \`#\` ou \`%\` dans ce mot de passe sans les encoder dans l’URL. Pour \`cargo run\`, gardez le mot de passe de \`DATABASE_URL\` synchronisé. La boutique applique les migrations SQLx au démarrage de l’application générée.

Pour créer le premier compte gestionnaire, définissez ensemble \`ECOM_ADMIN_EMAIL\` et \`ECOM_ADMIN_PASSWORD\` avant le premier démarrage. Le mot de passe doit contenir au moins 12 caractères ; il est haché avec Argon2. Aucun compte ou mot de passe par défaut n’est fourni.

## Démarrage

Le générateur SpecForge ne démarre aucun service et ne crée aucune base de données. Le projet comprend une configuration Docker Compose optionnelle ; après avoir configuré les secrets, vous pouvez choisir de lancer l’environnement généré avec \`docker compose up --build\`. Le port PostgreSQL Compose est lié à \`127.0.0.1\` et peut être réglé avec \`POSTGRES_PORT\`. Le Dockerfile utilise \`Cargo.lock\` s’il est présent ; sinon, Cargo le résout pendant le build de l’image.

Pour le développement séparé, démarrez PostgreSQL selon votre environnement, lancez le backend Rust avec \`cargo run\`, puis le frontend avec \`cd frontend && npm install && npm run dev\`.

## Interface

Le storefront, l’espace client et l’administration reprennent les principes UI/UX du prototype R&D : identité crème et vert sauge, navigation éditoriale, footer structuré, navigation mobile fixe et navigation latérale pour l’administration sur grand écran. Le prototype statique sert de référence visuelle uniquement ; ses données fictives ne sont pas utilisées par l’application générée. Les écrans métier consomment les API du projet et présentent leurs états de chargement, d’erreur et d’absence de données.

## Paiements et périmètre

La migration fournit un produit de démonstration en stock, un mode de livraison standard, un paiement mock et le code promotionnel \`DEMO10\`. Le parcours de démonstration est : créer un compte, ajouter le produit au panier, sélectionner la livraison, valider la commande avec ou sans \`DEMO10\`, puis se connecter à l’administration avec un compte gestionnaire configuré.

Dans l’administration, préparer puis expédier la commande consomme la réservation de stock ; marquer la commande livrée permet au client de demander un retour. L’opérateur peut approuver puis réceptionner le retour, réintégrer le stock et effectuer le remboursement mock plafonné au paiement capturé. Les rôles et transitions sont vérifiés par le backend.

Le compte client permet également de créer, lister, modifier et supprimer des adresses enregistrées, puis de sélectionner une adresse de livraison au checkout. Les adresses ne sont accessibles qu’au client propriétaire.

## Test d’acceptation PostgreSQL

Le test \`catalog_to_mock_refund_acceptance_flow\` couvre catalogue, inscription, adresses, commande et paiement mock, stock, retour/remboursement, variation des indicateurs par devise, génération PDF et isolation d’accès, publication/duplication/suppression de contenu et mise en file idempotente d’une relance. Il est ignoré par défaut. Pour l’exécuter, préparez une base PostgreSQL **jetable** dont le nom se termine par \`_test\`, configurez \`JWT_SECRET\`, \`ECOM_ADMIN_EMAIL\`, \`ECOM_ADMIN_PASSWORD\`, \`ECOMMERCE_TEST_DATABASE_URL\` et définissez \`ECOMMERCE_ACCEPTANCE_TESTS=1\`, puis lancez :

\`\`\`sh
cargo test -- --ignored catalog_to_mock_refund_acceptance_flow
\`\`\`

Le test applique les migrations et écrit des données dans cette base ; ne pointez jamais \`ECOMMERCE_TEST_DATABASE_URL\` vers une base partagée ou de production. Il n’installe ni ne démarre PostgreSQL ou Docker.

Le paiement est un mock local déterministe : aucun appel PSP et aucune donnée de carte ne sont collectés. Les pages de contenu et menus sont éditables par le gestionnaire et l’éditeur; le dashboard de gestion est réservé au gestionnaire et ne convertit pas les montants entre devises. Les documents téléchargeables sont des PDF opérationnels basés sur les snapshots de commande, pas des factures fiscales ou des avoirs. Les notifications de relance sont mises en attente dans PostgreSQL ; aucun service d’e-mail externe n’est configuré.

Après initialisation de PostgreSQL, le backend démarre une tâche de relance des paniers abandonnés. Elle s’exécute selon \`tasks.cart_recovery_interval_minutes\` (60 minutes par défaut), traite au plus 100 paniers par lot et utilise \`shop.cart_abandon_delay_hours\` (10 heures par défaut). Elle place uniquement des notifications en attente ; aucun courriel n’est envoyé sans transport configuré.
`,
    ),
  ],
  () => [{
    id: 'ADR-ECOM-ADMIN',
    title: 'Administration minimale e-commerce',
    status: 'Accepted',
    context: 'La v1 exige un accès opérateur limité sans moteur de permissions générique.',
    decision: 'Les rôles manager, operator et editor sont vérifiés côté serveur avec des capacités explicites.',
    consequences: ['Les droits granulaires et les tableaux de bord avancés restent hors v1.'],
    generatingBrick: 'ecom-admin',
  }],
);

export const ECOMMERCE_BRICKS: BrickDefinition[] = [
  catalogBrick,
  pricingBrick,
  cartOrdersBrick,
  accountsBrick,
  paymentBrick,
  inventoryBrick,
  notificationsBrick,
  auditOpsBrick,
  adminBrick,
];
