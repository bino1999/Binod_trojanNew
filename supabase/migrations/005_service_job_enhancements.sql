-- ============================================================
-- Migration 005: Service Job Enhancements
-- Phase 1: Add mileage_in, customer_complaint, service_type
-- Phase 2: Expand status enum (underscores, waiting_for_parts, estimate)
--           Create job_pending_parts table
-- ============================================================

-- 1. Drop old status constraint first (must happen before data update)
ALTER TABLE service_jobs DROP CONSTRAINT IF EXISTS service_jobs_status_check;

-- 2. Normalise existing status values to underscore convention
UPDATE service_jobs SET status = 'in_progress' WHERE status = 'in-progress';

-- 3. Add expanded constraint with all new statuses
ALTER TABLE service_jobs ADD CONSTRAINT service_jobs_status_check
  CHECK (status IN ('estimate', 'open', 'in_progress', 'waiting_for_parts', 'completed', 'invoiced'));

-- 3. New columns on service_jobs
ALTER TABLE service_jobs
  ADD COLUMN IF NOT EXISTS mileage_in        INTEGER,
  ADD COLUMN IF NOT EXISTS customer_complaint TEXT,
  ADD COLUMN IF NOT EXISTS service_type      TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE service_jobs
  ADD CONSTRAINT service_jobs_service_type_check
  CHECK (service_type IN ('normal', 'mechanical', 'estimate'));

-- 4. Pending-parts tracking table (foundation for Phase 3 out-of-stock workflow)
CREATE TABLE IF NOT EXISTS job_pending_parts (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id             UUID        NOT NULL REFERENCES service_jobs(job_id) ON DELETE CASCADE,
  product_id         UUID        NOT NULL REFERENCES products(product_id),
  qty_needed         INTEGER     NOT NULL CHECK (qty_needed > 0),
  purchase_order_id  UUID        REFERENCES purchase_orders(purchase_order_id),
  resolved           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE job_pending_parts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON job_pending_parts TO service_role;
