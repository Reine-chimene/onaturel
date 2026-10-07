-- Baseline aligned on SQLAlchemy models. If tables already exist (Alembic):
--   npx prisma migrate resolve --applied 0001_baseline
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "currencies" (
    "id" UUID NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "symbol" VARCHAR(16) NOT NULL,
    "minor_units" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_currencies_code" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "commercial_zones" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "currency_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commercial_zones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_commercial_zones_slug" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "zone_fulfillment_modes" (
    "id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "mode" VARCHAR(32) NOT NULL,
    "label" VARCHAR(64) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "fee_policy" VARCHAR(32) NOT NULL,
    "default_fee_amount" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zone_fulfillment_modes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_zone_fulfillment_mode" UNIQUE ("zone_id", "mode")
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "hashed_password" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "assigned_zone_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_users_email" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(128) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64),
    "payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "settings" (
    "key" VARCHAR(128) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "files" (
    "id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "variants" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "files_storage_key_key" ON "files"("storage_key");

CREATE TABLE IF NOT EXISTS "categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "image_file_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_categories_slug" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(64),
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category_id" UUID,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_products_slug" UNIQUE ("slug"),
    CONSTRAINT "uq_products_sku" UNIQUE ("sku")
);

CREATE TABLE IF NOT EXISTS "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_zone_prices" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "promo_price_amount" INTEGER,
    "promo_is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_zone_prices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_product_zone_price" UNIQUE ("product_id", "zone_id")
);

CREATE TABLE IF NOT EXISTS "bundles" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_bundles_slug" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "bundle_items" (
    "id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_bundle_item" UNIQUE ("bundle_id", "product_id")
);

CREATE TABLE IF NOT EXISTS "bundle_zone_prices" (
    "id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "promo_price_amount" INTEGER,
    "promo_is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bundle_zone_prices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_bundle_zone_price" UNIQUE ("bundle_id", "zone_id")
);

CREATE TABLE IF NOT EXISTS "promotions" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "bundle_id" UUID,
    "zone_id" UUID NOT NULL,
    "promo_price_amount" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_positions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_positions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_inventory_position" UNIQUE ("product_id", "zone_id")
);

CREATE TABLE IF NOT EXISTS "inventory_movements" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "qty_delta" INTEGER NOT NULL,
    "reason" VARCHAR(32) NOT NULL,
    "reference_type" VARCHAR(32),
    "reference_id" VARCHAR(64),
    "transfer_group_id" UUID,
    "note" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "last_zone_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_customers_phone" UNIQUE ("phone")
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID NOT NULL,
    "number" VARCHAR(32) NOT NULL,
    "zone_id" UUID NOT NULL,
    "currency_id" UUID NOT NULL,
    "currency_code" VARCHAR(8) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "customer_id" UUID,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(32) NOT NULL,
    "fulfillment_mode" VARCHAR(32) NOT NULL,
    "city" VARCHAR(128),
    "neighborhood" VARCHAR(128),
    "products_amount" INTEGER NOT NULL DEFAULT 0,
    "fulfillment_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "products_payment_status" VARCHAR(32) NOT NULL,
    "fulfillment_payment_status" VARCHAR(32) NOT NULL,
    "stock_decremented_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_orders_number" UNIQUE ("number")
);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "bundle_id" UUID,
    "name_snapshot" VARCHAR(255) NOT NULL,
    "unit_price_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales" (
    "id" UUID NOT NULL,
    "number" VARCHAR(32) NOT NULL,
    "zone_id" UUID NOT NULL,
    "currency_id" UUID NOT NULL,
    "currency_code" VARCHAR(8) NOT NULL,
    "seller_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    "products_amount" INTEGER NOT NULL DEFAULT 0,
    "fulfillment_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(32) NOT NULL,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "amount_remaining" INTEGER NOT NULL DEFAULT 0,
    "customer_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_sales_number" UNIQUE ("number")
);

CREATE TABLE IF NOT EXISTS "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID,
    "bundle_id" UUID,
    "name_snapshot" VARCHAR(255) NOT NULL,
    "unit_price_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,
    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "order_id" UUID,
    "sale_id" UUID,
    "amount" INTEGER NOT NULL,
    "currency_id" UUID NOT NULL,
    "method" VARCHAR(32) NOT NULL,
    "recorded_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "documents" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "number" VARCHAR(32) NOT NULL,
    "sale_id" UUID,
    "order_id" UUID,
    "zone_id" UUID NOT NULL,
    "currency_id" UUID NOT NULL,
    "issued_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_documents_number" UNIQUE ("number")
);

CREATE TABLE IF NOT EXISTS "cash_closures" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "currency_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "cash_expected" INTEGER NOT NULL DEFAULT 0,
    "mobile_money_expected" INTEGER NOT NULL DEFAULT 0,
    "other_expected" INTEGER NOT NULL DEFAULT 0,
    "total_expected" INTEGER NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "closed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_closures_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cash_closure_day" UNIQUE ("seller_id", "zone_id", "business_date")
);
