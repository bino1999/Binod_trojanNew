-- ============================================================
-- Migration 002: Schema patch — add missing product fields,
-- registration_number to vehicles, and fix nullable FK
-- ============================================================

-- Products: add SKU, pricing, and reorder fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku           TEXT,
  ADD COLUMN IF NOT EXISTS cost_price    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS reorder_level INTEGER NOT NULL DEFAULT 5;

-- Vehicles: frontend uses registration_number, schema had plate_number
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Populate registration_number from existing plate_number data
UPDATE vehicles SET registration_number = plate_number WHERE registration_number IS NULL;

-- Service jobs: customer should be optional for walk-in jobs
ALTER TABLE service_jobs ALTER COLUMN customer_id DROP NOT NULL;
