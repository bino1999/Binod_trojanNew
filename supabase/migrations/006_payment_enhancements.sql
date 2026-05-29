-- ============================================================
-- Migration 006: Payment Collection for Service Jobs
-- Adds invoice_number, payment fields, and 'paid' status
-- ============================================================

-- 1. Drop old status constraint
ALTER TABLE service_jobs DROP CONSTRAINT IF EXISTS service_jobs_status_check;

-- 2. Add expanded constraint including 'paid'
ALTER TABLE service_jobs ADD CONSTRAINT service_jobs_status_check
  CHECK (status IN ('estimate', 'open', 'in_progress', 'waiting_for_parts', 'completed', 'invoiced', 'paid'));

-- 3. Add payment-related columns
ALTER TABLE service_jobs
  ADD COLUMN IF NOT EXISTS invoice_number    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_method   TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque')),
  ADD COLUMN IF NOT EXISTS payment_date     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS amount_tendered  NUMERIC(12,2);

-- 4. Sequence for invoice numbers (INV-0001, INV-0002 …)
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- 5. Function to auto-generate invoice_number when status transitions to 'invoiced'
--    Only sets it if invoice_number is still NULL (idempotent)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'invoiced' AND NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('invoice_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
BEFORE UPDATE ON service_jobs
FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
