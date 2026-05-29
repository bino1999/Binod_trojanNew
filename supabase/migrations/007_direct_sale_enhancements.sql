-- ============================================================
-- Migration 007: Direct Sale Enhancements
-- Adds invoice_number, payment detail fields, cheque support,
-- and fixes the 'transfer' → 'bank_transfer' naming inconsistency
-- ============================================================

-- 1. Migrate any existing rows that used the old 'transfer' value
UPDATE sales SET payment_method = 'bank_transfer' WHERE payment_method = 'transfer';

-- 2. Drop old payment_method constraint
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;

-- 3. Add expanded constraint (bank_transfer replaces transfer, cheque added)
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque'));

-- 4. Add payment + invoice tracking columns
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_number    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS amount_tendered   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS payment_date      TIMESTAMPTZ;

-- 5. Sequence for sale invoice numbers (INV-S-XXXX)
--    Using INV-S- prefix to distinguish from service job INV-XXXX numbers
CREATE SEQUENCE IF NOT EXISTS sale_invoice_seq START 1;

-- 6. Function to auto-generate invoice_number on every INSERT into sales
CREATE OR REPLACE FUNCTION generate_sale_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-S-' || LPAD(nextval('sale_invoice_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_invoice_number
BEFORE INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION generate_sale_invoice_number();
