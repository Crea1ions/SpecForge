import { GenerationContext, GeneratedFile } from '../types';

const SCHEMA_MIGRATION = `-- E-commerce schema for PostgreSQL 15+.
-- Keep dependency order explicit so SQLx can apply this migration on an empty database.

CREATE TABLE tax_rates (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    rate_bp INTEGER NOT NULL CHECK (rate_bp >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, rate_bp)
);

CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    locale TEXT NOT NULL DEFAULT 'fr',
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX customers_email_lower_uidx ON customers (lower(email));

CREATE TABLE customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_type TEXT NOT NULL CHECK (address_type IN ('billing', 'shipping', 'both')),
    recipient TEXT NOT NULL,
    street1 TEXT NOT NULL,
    street2 TEXT,
    zip TEXT NOT NULL,
    city TEXT NOT NULL,
    country CHAR(2) NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
    region TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX customer_addresses_customer_idx ON customer_addresses (customer_id);

CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('manager', 'operator', 'editor')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX admin_users_email_lower_uidx ON admin_users (lower(email));

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT,
    name JSONB NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (parent_id IS NULL OR parent_id <> id),
    CHECK (jsonb_typeof(name) = 'object')
);
CREATE INDEX categories_parent_position_idx ON categories (parent_id, position);
CREATE INDEX categories_path_pattern_idx ON categories (path text_pattern_ops);
CREATE INDEX categories_name_i18n_gin ON categories USING GIN (name);

CREATE TABLE promotions (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    discount_kind TEXT NOT NULL CHECK (discount_kind IN ('percent', 'fixed_amount')),
    discount_bp INTEGER,
    discount_amount BIGINT,
    currency CHAR(3),
    max_discount_amount BIGINT,
    min_order_amount BIGINT,
    min_quantity INTEGER,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (discount_kind = 'percent'
            AND discount_bp IS NOT NULL AND discount_bp BETWEEN 1 AND 10000
            AND discount_amount IS NULL)
        OR
        (discount_kind = 'fixed_amount'
            AND discount_amount IS NOT NULL AND discount_amount > 0
            AND discount_bp IS NULL AND currency IS NOT NULL)
    ),
    CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
    CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
    CHECK (min_quantity IS NULL OR min_quantity > 0),
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
    CHECK (usage_limit IS NULL OR usage_limit >= 0),
    CHECK (used_count >= 0 AND (usage_limit IS NULL OR used_count <= usage_limit)),
    CHECK (
        (max_discount_amount IS NULL AND min_order_amount IS NULL)
        OR currency IS NOT NULL
    )
);

CREATE TABLE payment_providers (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'disabled' CHECK (mode IN ('disabled', 'enabled', 'test')),
    is_published BOOLEAN NOT NULL DEFAULT false,
    capabilities JSONB NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (jsonb_typeof(capabilities) = 'object'),
    CHECK (jsonb_typeof(config) = 'object')
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    name JSONB NOT NULL,
    description_short JSONB,
    description_long JSONB,
    price_catalog BIGINT NOT NULL CHECK (price_catalog >= 0),
    compare_price BIGINT,
    currency CHAR(3) NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
    tax_rate_id BIGINT NOT NULL REFERENCES tax_rates(id) ON DELETE RESTRICT,
    weight_grams INTEGER CHECK (weight_grams IS NULL OR weight_grams >= 0),
    volume_cm3 INTEGER CHECK (volume_cm3 IS NULL OR volume_cm3 >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_sellable BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    display_order INTEGER NOT NULL DEFAULT 0,
    stock_tracked BOOLEAN NOT NULL DEFAULT false,
    allow_out_of_stock BOOLEAN NOT NULL DEFAULT false,
    out_of_stock_message JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (compare_price IS NULL OR compare_price > price_catalog),
    CHECK (jsonb_typeof(name) = 'object'),
    CHECK (description_short IS NULL OR jsonb_typeof(description_short) = 'object'),
    CHECK (description_long IS NULL OR jsonb_typeof(description_long) = 'object'),
    CHECK (out_of_stock_message IS NULL OR jsonb_typeof(out_of_stock_message) = 'object')
);
CREATE INDEX products_catalog_idx ON products (is_active, is_sellable, is_published, display_order);
CREATE INDEX products_tax_rate_idx ON products (tax_rate_id);
CREATE INDEX products_name_i18n_gin ON products USING GIN (name);
CREATE INDEX products_description_short_i18n_gin ON products USING GIN (description_short);

CREATE TABLE product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt JSONB,
    position INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (alt IS NULL OR jsonb_typeof(alt) = 'object')
);
CREATE INDEX product_images_product_position_idx ON product_images (product_id, position);
CREATE UNIQUE INDEX product_images_one_primary_uidx ON product_images (product_id) WHERE is_primary;
CREATE INDEX product_images_alt_i18n_gin ON product_images USING GIN (alt);

CREATE TABLE product_categories (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, category_id)
);
CREATE UNIQUE INDEX product_categories_one_primary_uidx
    ON product_categories (product_id) WHERE is_primary;
CREATE INDEX product_categories_category_idx ON product_categories (category_id);

CREATE TABLE shipping_methods (
    id BIGSERIAL PRIMARY KEY,
    name JSONB NOT NULL,
    pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'rules')),
    fixed_price BIGINT,
    currency CHAR(3) NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
    tax_rate_id BIGINT NOT NULL REFERENCES tax_rates(id) ON DELETE RESTRICT,
    free_over_amount BIGINT,
    max_weight_grams INTEGER,
    countries JSONB,
    tracking_url_template TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (pricing_type <> 'fixed' OR fixed_price IS NOT NULL),
    CHECK (fixed_price IS NULL OR fixed_price >= 0),
    CHECK (free_over_amount IS NULL OR free_over_amount >= 0),
    CHECK (max_weight_grams IS NULL OR max_weight_grams >= 0),
    CHECK (countries IS NULL OR jsonb_typeof(countries) IN ('array', 'object')),
    CHECK (jsonb_typeof(name) = 'object')
);
CREATE INDEX shipping_methods_tax_rate_idx ON shipping_methods (tax_rate_id);
CREATE INDEX shipping_methods_name_i18n_gin ON shipping_methods USING GIN (name);

CREATE TABLE shipping_price_rules (
    id BIGSERIAL PRIMARY KEY,
    shipping_method_id BIGINT NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
    variable TEXT NOT NULL CHECK (variable IN ('weight', 'amount', 'quantity')),
    max_value INTEGER NOT NULL CHECK (max_value > 0),
    base_price BIGINT NOT NULL CHECK (base_price >= 0),
    price_per_unit BIGINT NOT NULL CHECK (price_per_unit >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shipping_method_id, variable, max_value)
);

CREATE TABLE carts (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    session_token TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'converted', 'abandoned')),
    currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    shipping_method_id BIGINT REFERENCES shipping_methods(id) ON DELETE SET NULL,
    recovery_email_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX carts_one_open_per_customer_uidx
    ON carts (customer_id) WHERE status = 'open' AND customer_id IS NOT NULL;
CREATE UNIQUE INDEX carts_one_open_per_session_uidx
    ON carts (session_token) WHERE status = 'open' AND session_token IS NOT NULL;
CREATE INDEX carts_customer_status_idx ON carts (customer_id, status);
CREATE INDEX carts_shipping_method_idx ON carts (shipping_method_id);

CREATE TABLE cart_lines (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
    currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    tax_rate_bp INTEGER NOT NULL CHECK (tax_rate_bp >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cart_id, product_id)
);
CREATE INDEX cart_lines_product_idx ON cart_lines (product_id);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (
        status IN ('pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled')
    ),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'authorized', 'paid', 'partially_refunded', 'refunded')
    ),
    currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    subtotal_excl_tax BIGINT NOT NULL CHECK (subtotal_excl_tax >= 0),
    tax_total BIGINT NOT NULL CHECK (tax_total >= 0),
    shipping_total BIGINT NOT NULL CHECK (shipping_total >= 0),
    discount_total BIGINT NOT NULL CHECK (discount_total >= 0),
    total BIGINT NOT NULL CHECK (total >= 0),
    billing_address JSONB NOT NULL CHECK (jsonb_typeof(billing_address) = 'object'),
    shipping_address JSONB NOT NULL CHECK (jsonb_typeof(shipping_address) = 'object'),
    shipping_method_id BIGINT REFERENCES shipping_methods(id) ON DELETE RESTRICT,
    shipping_method_name TEXT,
    promotion_id BIGINT REFERENCES promotions(id) ON DELETE RESTRICT,
    promotion_code TEXT,
    access_token TEXT NOT NULL UNIQUE,
    placed_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (total = subtotal_excl_tax + tax_total + shipping_total),
    CHECK (
        (shipping_method_id IS NULL AND shipping_method_name IS NULL)
        OR shipping_method_name IS NOT NULL
    )
);
CREATE INDEX orders_customer_placed_idx ON orders (customer_id, placed_at DESC);
CREATE INDEX orders_status_placed_idx ON orders (status, placed_at);
CREATE INDEX orders_promotion_idx ON orders (promotion_id);
CREATE INDEX orders_shipping_method_idx ON orders (shipping_method_id);

CREATE TABLE order_lines (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
    sku TEXT NOT NULL,
    name JSONB NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_excl_tax BIGINT NOT NULL CHECK (unit_price_excl_tax >= 0),
    discount_excl_tax BIGINT NOT NULL DEFAULT 0 CHECK (discount_excl_tax >= 0),
    tax_rate_bp INTEGER NOT NULL CHECK (tax_rate_bp >= 0),
    tax_amount BIGINT NOT NULL CHECK (tax_amount >= 0),
    total_excl_tax BIGINT NOT NULL CHECK (total_excl_tax >= 0),
    total_incl_tax BIGINT NOT NULL CHECK (total_incl_tax >= 0),
    currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    is_shipping BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (total_incl_tax = total_excl_tax + tax_amount),
    CHECK (jsonb_typeof(name) = 'object')
);
CREATE INDEX order_lines_order_idx ON order_lines (order_id);
CREATE INDEX order_lines_product_idx ON order_lines (product_id);
CREATE INDEX order_lines_name_i18n_gin ON order_lines USING GIN (name);

CREATE TABLE payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    provider_id BIGINT NOT NULL REFERENCES payment_providers(id) ON DELETE RESTRICT,
    parent_id BIGINT REFERENCES payment_transactions(id) ON DELETE RESTRICT,
    reference TEXT NOT NULL UNIQUE,
    operation TEXT NOT NULL DEFAULT 'payment' CHECK (operation IN ('payment', 'refund')),
    amount BIGINT NOT NULL,
    currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'pending', 'authorized', 'done', 'cancel', 'error')
    ),
    status_message TEXT,
    last_state_change TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (operation = 'payment' AND amount >= 0)
        OR (operation = 'refund' AND amount <= 0)
    ),
    CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX payment_transactions_order_status_idx ON payment_transactions (order_id, status);
CREATE INDEX payment_transactions_provider_idx ON payment_transactions (provider_id);
CREATE INDEX payment_transactions_parent_idx ON payment_transactions (parent_id);

CREATE TABLE shipments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'ready', 'shipped', 'delivered', 'cancelled')
    ),
    tracking_ref TEXT,
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX shipments_status_idx ON shipments (status);

CREATE TABLE stock_levels (
    product_id BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity_reserved <= quantity_on_hand)
);

CREATE TABLE return_requests (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (
        status IN ('requested', 'approved', 'rejected', 'received', 'closed', 'cancelled')
    ),
    reason TEXT NOT NULL,
    refusal_reason TEXT,
    received_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status <> 'rejected' OR refusal_reason IS NOT NULL)
);
CREATE INDEX return_requests_order_idx ON return_requests (order_id);
CREATE INDEX return_requests_customer_status_idx ON return_requests (customer_id, status);

CREATE TABLE return_lines (
    id BIGSERIAL PRIMARY KEY,
    return_request_id BIGINT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_line_id BIGINT NOT NULL REFERENCES order_lines(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    restock BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (return_request_id, order_line_id)
);
CREATE INDEX return_lines_order_line_idx ON return_lines (order_line_id);

CREATE TABLE stock_moves (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    move_type TEXT NOT NULL CHECK (
        move_type IN ('reservation', 'reservation_release', 'shipment', 'return_receipt', 'restock', 'adjustment')
    ),
    order_id BIGINT REFERENCES orders(id) ON DELETE RESTRICT,
    shipment_id BIGINT REFERENCES shipments(id) ON DELETE RESTRICT,
    return_request_id BIGINT REFERENCES return_requests(id) ON DELETE RESTRICT,
    actor TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX stock_moves_product_created_idx ON stock_moves (product_id, created_at DESC);
CREATE INDEX stock_moves_order_idx ON stock_moves (order_id);
CREATE INDEX stock_moves_shipment_idx ON stock_moves (shipment_id);
CREATE INDEX stock_moves_return_request_idx ON stock_moves (return_request_id);

CREATE TABLE notification_templates (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    locale TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (key, locale)
);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    template_key TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX notifications_status_created_idx ON notifications (status, created_at);
CREATE INDEX notifications_order_idx ON notifications (order_id);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id BIGINT NOT NULL,
    event TEXT NOT NULL,
    actor TEXT NOT NULL,
    diff JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_logs_entity_created_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_event_created_idx ON audit_logs (event, created_at DESC);

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'tax_rates', 'customers', 'customer_addresses', 'admin_users', 'settings', 'categories', 'promotions',
        'payment_providers', 'products', 'product_images', 'product_categories',
        'shipping_methods', 'shipping_price_rules', 'carts', 'cart_lines', 'orders',
        'order_lines', 'payment_transactions', 'shipments', 'stock_levels',
        'return_requests', 'return_lines', 'stock_moves', 'notification_templates',
        'notifications'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            table_name || '_set_updated_at',
            table_name
        );
    END LOOP;
END;
$$;

CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
`;

const SEED_MIGRATION = `-- Deterministic, idempotent defaults for a new e-commerce project.

INSERT INTO tax_rates (name, rate_bp, is_active)
VALUES
    ('TVA standard', 2000, true),
    ('TVA réduite', 550, true),
    ('Sans TVA', 0, true)
ON CONFLICT (name, rate_bp) DO NOTHING;

INSERT INTO promotions (
    code, name, discount_kind, discount_bp, is_active
)
VALUES ('DEMO10', 'Promotion de démonstration', 'percent', 1000, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_methods (
    name, pricing_type, fixed_price, currency, tax_rate_id, is_published, position
)
SELECT
    '{"fr":"Livraison standard"}'::jsonb,
    'fixed',
    500,
    'EUR',
    tax_rates.id,
    true,
    0
FROM tax_rates
WHERE tax_rates.name = 'TVA standard' AND tax_rates.rate_bp = 2000
  AND NOT EXISTS (
      SELECT 1
      FROM shipping_methods
      WHERE name ->> 'fr' = 'Livraison standard'
  );

INSERT INTO categories (name, slug, path, position)
VALUES ('{"fr":"Démonstration"}'::jsonb, 'demo', '/demo', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
    sku, name, description_short, description_long, price_catalog, currency,
    tax_rate_id, weight_grams, is_active, is_sellable, is_published,
    published_at, display_order, stock_tracked, allow_out_of_stock
)
SELECT
    'DEMO-001',
    '{"fr":"Produit de démonstration"}'::jsonb,
    '{"fr":"Remplacez ce produit par votre catalogue."}'::jsonb,
    '{"fr":"Un produit d’exemple pour vérifier le parcours catalogue, panier et commande."}'::jsonb,
    2490,
    'EUR',
    tax_rates.id,
    250,
    true,
    true,
    true,
    CURRENT_TIMESTAMP,
    0,
    true,
    false
FROM tax_rates
WHERE tax_rates.name = 'TVA standard' AND tax_rates.rate_bp = 2000
ON CONFLICT (sku) DO NOTHING;

INSERT INTO product_images (product_id, url, alt, position, is_primary)
SELECT products.id, '/images/demo-product.svg',
       '{"fr":"Produit de démonstration"}'::jsonb, 0, true
FROM products
WHERE products.sku = 'DEMO-001'
  AND NOT EXISTS (
      SELECT 1 FROM product_images
      WHERE product_id = products.id AND is_primary = true
  );

INSERT INTO product_categories (product_id, category_id, is_primary)
SELECT products.id, categories.id, true
FROM products CROSS JOIN categories
WHERE products.sku = 'DEMO-001' AND categories.slug = 'demo'
ON CONFLICT (product_id, category_id) DO NOTHING;

INSERT INTO stock_levels (product_id, quantity_on_hand)
SELECT id, 10 FROM products WHERE sku = 'DEMO-001'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO payment_providers (code, name, mode, is_published, capabilities, config)
VALUES (
    'mock',
    'Mock payment provider',
    'test',
    true,
    '{"tokenization": false, "manual_capture": false, "refund": "partial", "express_checkout": false}'::jsonb,
    '{"scenario": "success"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO settings (key, value)
VALUES
    ('shop.currency', '"EUR"'::jsonb),
    ('shop.tax_display', '"ht"'::jsonb),
    ('shop.cart_abandon_delay_hours', '10'::jsonb),
    ('tasks.cart_recovery_enabled', 'true'::jsonb),
    ('tasks.cart_recovery_interval_minutes', '60'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO notification_templates (key, locale, subject, body, is_active)
VALUES
    ('order_confirmed', 'fr', 'Confirmation de commande', 'Votre commande {{order_number}} est confirmee.', true),
    ('payment_received', 'fr', 'Paiement recu', 'Le paiement de la commande {{order_number}} a ete recu.', true),
    ('account_created', 'fr', 'Bienvenue', 'Votre compte client est cree.', true),
    ('order_shipped', 'fr', 'Commande expédiée', 'Votre commande {{order_number}} a été expédiée.', true),
    ('return_closed', 'fr', 'Retour traité', 'Votre retour pour la commande {{order_number}} a été traité.', true),
    ('password_reset', 'fr', 'Reinitialisation du mot de passe', 'Suivez le lien securise fourni par l application.', true),
    ('cart_recovery', 'fr', 'Votre panier', 'Votre panier vous attend.', true)
ON CONFLICT (key, locale) DO NOTHING;
`;

function makeMigrationFile(path: string, content: string, reason: string): GeneratedFile {
  const normalizedContent = content.trimStart();
  return {
    path,
    content: normalizedContent,
    language: 'sql',
    size: new TextEncoder().encode(normalizedContent).length,
    brickId: 'postgres-storage',
    brickName: 'PostgreSQL Enterprise Storage',
    brickVersion: '1.2.1',
    reason,
  };
}

export function generateEcommerceSchemaFiles(ctx: GenerationContext): GeneratedFile[] {
  if (!ctx.spec.database.enabled || ctx.spec.database.type !== 'postgresql') {
    return [];
  }

  return [
    makeMigrationFile(
      'migrations/20261029000000_ecommerce_schema.sql',
      SCHEMA_MIGRATION,
      'Create the PostgreSQL 15+ e-commerce schema and its constraints, indexes, and timestamp triggers.'
    ),
    makeMigrationFile(
      'migrations/20261029000001_ecommerce_seed.sql',
      SEED_MIGRATION,
      'Seed deterministic e-commerce defaults with conflict-safe inserts.'
    ),
  ];
}
