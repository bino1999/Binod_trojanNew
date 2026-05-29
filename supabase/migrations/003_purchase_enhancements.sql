-- ============================================================
-- Migration 003: Purchase order enhancements
-- Adds payment method, VAT type, per-item detail fields,
-- brand/barcode on products, and extra fields on inventory
-- ============================================================

-- purchase_orders: payment method and VAT type
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'
    CHECK (payment_method IN ('cash','cheque','card','credit','bank_transfer')),
  ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'non_vat'
    CHECK (vat_type IN ('non_vat','vat_inclusive','vat_exclusive'));

-- purchase_order_items: extra fields captured at time of purchase
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS discount_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level     INTEGER       NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS rack_no           TEXT,
  ADD COLUMN IF NOT EXISTS bin_no            TEXT,
  ADD COLUMN IF NOT EXISTS note              TEXT,
  ADD COLUMN IF NOT EXISTS is_genuine        BOOLEAN       NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS purchase_date     DATE;

-- products: brand and barcode for richer product catalogue
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand   TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- inventory: store extra fields that arrive with each purchase batch
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS rack_no          TEXT,
  ADD COLUMN IF NOT EXISTS bin_no           TEXT,
  ADD COLUMN IF NOT EXISTS is_genuine       BOOLEAN       NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 0;
