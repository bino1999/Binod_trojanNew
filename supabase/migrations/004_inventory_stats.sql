-- ============================================================
-- Migration 004: Inventory stats function
-- Returns each inventory row enriched with:
--   qty_bought  — qty received from the linked purchase order
--   qty_sold    — total sold from sale_items for this inventory row
-- ============================================================

CREATE OR REPLACE FUNCTION get_inventory_with_stats()
RETURNS TABLE (
  inventory_id      UUID,
  product_id        UUID,
  supplier_id       UUID,
  purchase_order_id UUID,
  qty_in_stock      INTEGER,
  qty_bought        INTEGER,
  qty_sold          BIGINT,
  company_price     NUMERIC,
  selling_price     NUMERIC,
  profit_margin     NUMERIC,
  reorder_level     INTEGER,
  rack_no           TEXT,
  bin_no            TEXT,
  is_genuine        BOOLEAN,
  discount_percent  NUMERIC,
  location          TEXT,
  batch_number      TEXT,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ,
  product_name      TEXT,
  product_sku       TEXT,
  product_category  TEXT,
  product_unit      TEXT,
  supplier_name     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    i.inventory_id,
    i.product_id,
    i.supplier_id,
    i.purchase_order_id,
    i.qty_in_stock,
    COALESCE(poi.qty_received, 0)::INTEGER  AS qty_bought,
    COALESCE(sa.qty_sold,      0)           AS qty_sold,
    i.company_price,
    i.selling_price,
    i.profit_margin,
    i.reorder_level,
    i.rack_no,
    i.bin_no,
    i.is_genuine,
    i.discount_percent,
    i.location,
    i.batch_number,
    i.expiry_date,
    i.created_at,
    i.updated_at,
    p.name      AS product_name,
    p.sku       AS product_sku,
    p.category  AS product_category,
    p.unit      AS product_unit,
    s.name      AS supplier_name
  FROM inventory i
  LEFT JOIN products  p ON p.product_id  = i.product_id
  LEFT JOIN suppliers s ON s.supplier_id = i.supplier_id
  LEFT JOIN (
    SELECT purchase_order_id, product_id,
           SUM(qty_received)::INTEGER AS qty_received
    FROM   purchase_order_items
    GROUP  BY purchase_order_id, product_id
  ) poi ON poi.purchase_order_id = i.purchase_order_id
       AND poi.product_id        = i.product_id
  LEFT JOIN (
    SELECT inventory_id, SUM(qty_sold) AS qty_sold
    FROM   sale_items
    GROUP  BY inventory_id
  ) sa ON sa.inventory_id = i.inventory_id
  ORDER BY i.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION get_inventory_with_stats() TO authenticated, service_role;
