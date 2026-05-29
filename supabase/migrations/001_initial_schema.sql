-- ============================================================
-- IMS — Vehicle Service Center
-- Migration 001: Full initial schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER PROFILES (extends Supabase Auth)
-- ============================================================
CREATE TABLE user_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL CHECK (role IN ('admin','manager','cashier','technician','warehouse')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCT MASTER
-- ============================================================
CREATE TABLE products (
  product_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  unit        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
  supplier_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier ↔ Product link (many-to-many)
CREATE TABLE supplier_products (
  supplier_product_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id           UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  default_company_price NUMERIC(12,2),
  notes                 TEXT,
  UNIQUE (supplier_id, product_id)
);

-- ============================================================
-- PURCHASE ORDERS (Stock In)
-- ============================================================
CREATE TABLE purchase_orders (
  purchase_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id       UUID NOT NULL REFERENCES suppliers(supplier_id),
  order_date        DATE NOT NULL,
  received_date     DATE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','cancelled')),
  invoice_number    TEXT,
  total_amount      NUMERIC(12,2) DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES user_profiles(user_id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  po_item_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(product_id),
  qty_ordered         INTEGER NOT NULL CHECK (qty_ordered > 0),
  qty_received        INTEGER NOT NULL DEFAULT 0,
  company_price       NUMERIC(12,2) NOT NULL,
  selling_price       NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- INVENTORY (Live stock ledger)
-- ============================================================
CREATE TABLE inventory (
  inventory_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID NOT NULL REFERENCES products(product_id),
  supplier_id       UUID REFERENCES suppliers(supplier_id),
  purchase_order_id UUID REFERENCES purchase_orders(purchase_order_id),
  qty_in_stock      INTEGER NOT NULL DEFAULT 0 CHECK (qty_in_stock >= 0),
  company_price     NUMERIC(12,2) NOT NULL,
  selling_price     NUMERIC(12,2) NOT NULL,
  profit_margin     NUMERIC(12,2) GENERATED ALWAYS AS (selling_price - company_price) STORED,
  reorder_level     INTEGER NOT NULL DEFAULT 5,
  location          TEXT,
  batch_number      TEXT,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTERNAL USE
-- ============================================================
CREATE TABLE internal_use_records (
  internal_use_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID NOT NULL REFERENCES inventory(inventory_id),
  product_id      UUID NOT NULL REFERENCES products(product_id),
  qty_used        INTEGER NOT NULL CHECK (qty_used > 0),
  purpose         TEXT NOT NULL,
  used_by         UUID REFERENCES user_profiles(user_id),
  date_used       DATE NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS & VEHICLES
-- ============================================================
CREATE TABLE customers (
  customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
  vehicle_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  plate_number  TEXT NOT NULL,
  make          TEXT,
  model         TEXT,
  year          INTEGER,
  color         TEXT,
  mileage_in    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICE JOBS
-- ============================================================
CREATE TABLE service_jobs (
  job_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number           TEXT UNIQUE NOT NULL,
  customer_id          UUID NOT NULL REFERENCES customers(customer_id),
  vehicle_id           UUID NOT NULL REFERENCES vehicles(vehicle_id),
  assigned_technician  UUID REFERENCES user_profiles(user_id),
  job_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','completed','invoiced')),
  labor_description    TEXT,
  labor_cost           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_parts_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount         NUMERIC(12,2) GENERATED ALWAYS AS (labor_cost + total_parts_cost) STORED,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_job_items (
  job_item_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES service_jobs(job_id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(inventory_id),
  product_id   UUID NOT NULL REFERENCES products(product_id),
  qty_used     INTEGER NOT NULL CHECK (qty_used > 0),
  unit_price   NUMERIC(12,2) NOT NULL,
  line_total   NUMERIC(12,2) GENERATED ALWAYS AS (qty_used * unit_price) STORED
);

-- Auto-generate job numbers
CREATE SEQUENCE service_job_seq START 1;
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.job_number := 'JOB-' || LPAD(nextval('service_job_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_number
BEFORE INSERT ON service_jobs
FOR EACH ROW EXECUTE FUNCTION generate_job_number();

-- Keep total_parts_cost in sync when job items change
CREATE OR REPLACE FUNCTION sync_job_parts_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_jobs
  SET total_parts_cost = (
    SELECT COALESCE(SUM(line_total), 0)
    FROM service_job_items
    WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
  )
  WHERE job_id = COALESCE(NEW.job_id, OLD.job_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_job_parts
AFTER INSERT OR UPDATE OR DELETE ON service_job_items
FOR EACH ROW EXECUTE FUNCTION sync_job_parts_cost();

-- ============================================================
-- DIRECT SALES
-- ============================================================
CREATE TABLE sales (
  sale_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number    TEXT UNIQUE NOT NULL,
  customer_id    UUID REFERENCES customers(customer_id),
  sale_date      DATE NOT NULL,
  total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','card','transfer')),
  notes          TEXT,
  created_by     UUID REFERENCES user_profiles(user_id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  sale_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id      UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(inventory_id),
  product_id   UUID NOT NULL REFERENCES products(product_id),
  qty_sold     INTEGER NOT NULL CHECK (qty_sold > 0),
  unit_price   NUMERIC(12,2) NOT NULL,
  line_total   NUMERIC(12,2) GENERATED ALWAYS AS (qty_sold * unit_price) STORED
);

-- Auto-generate sale numbers
CREATE SEQUENCE sale_seq START 1;
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sale_number := 'SALE-' || LPAD(nextval('sale_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_number
BEFORE INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION generate_sale_number();

-- ============================================================
-- RETURNS
-- ============================================================
CREATE TABLE returns (
  return_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number       TEXT UNIQUE NOT NULL,
  source_type         TEXT NOT NULL CHECK (source_type IN ('sale','service_job')),
  source_id           UUID NOT NULL,
  customer_id         UUID REFERENCES customers(customer_id),
  return_date         DATE NOT NULL,
  reason              TEXT,
  total_refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  processed_by        UUID REFERENCES user_profiles(user_id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE return_items (
  return_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id      UUID NOT NULL REFERENCES returns(return_id) ON DELETE CASCADE,
  inventory_id   UUID NOT NULL REFERENCES inventory(inventory_id),
  product_id     UUID NOT NULL REFERENCES products(product_id),
  qty_returned   INTEGER NOT NULL CHECK (qty_returned > 0),
  unit_price     NUMERIC(12,2) NOT NULL,
  line_total     NUMERIC(12,2) GENERATED ALWAYS AS (qty_returned * unit_price) STORED
);

-- Auto-generate return numbers
CREATE SEQUENCE return_seq START 1;
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.return_number := 'RET-' || LPAD(nextval('return_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_return_number
BEFORE INSERT ON returns
FOR EACH ROW EXECUTE FUNCTION generate_return_number();

-- ============================================================
-- STOCK ADJUSTMENTS (Write-offs)
-- ============================================================
CREATE TABLE stock_adjustments (
  adjustment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id  UUID NOT NULL REFERENCES inventory(inventory_id),
  product_id    UUID NOT NULL REFERENCES products(product_id),
  qty_adjusted  INTEGER NOT NULL,  -- negative = write-off, positive = correction
  reason        TEXT NOT NULL CHECK (reason IN ('damaged','expired','lost','correction','other')),
  notes         TEXT,
  adjusted_by   UUID REFERENCES user_profiles(user_id),
  date_adjusted DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce notes when reason = 'other'
CREATE OR REPLACE FUNCTION check_adjustment_notes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reason = 'other' AND (NEW.notes IS NULL OR TRIM(NEW.notes) = '') THEN
    RAISE EXCEPTION 'Notes are required when reason is "other"';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_adjustment_notes
BEFORE INSERT ON stock_adjustments
FOR EACH ROW EXECUTE FUNCTION check_adjustment_notes();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_inventory_product   ON inventory(product_id);
CREATE INDEX idx_inventory_supplier  ON inventory(supplier_id);
CREATE INDEX idx_po_supplier         ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status           ON purchase_orders(status);
CREATE INDEX idx_jobs_status         ON service_jobs(status);
CREATE INDEX idx_jobs_customer       ON service_jobs(customer_id);
CREATE INDEX idx_sales_date          ON sales(sale_date);
CREATE INDEX idx_returns_source      ON returns(source_type, source_id);

-- ============================================================
-- ROW LEVEL SECURITY (enable — policies to be added per role)
-- ============================================================
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_use_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_job_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments   ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by backend with service role key)
-- Frontend never talks directly to Supabase — all access goes through Express API.
-- Add per-role RLS policies here if you later expose Supabase directly to the frontend.
