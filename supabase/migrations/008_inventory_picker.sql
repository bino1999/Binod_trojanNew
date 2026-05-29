-- ============================================================
-- Migration 008: search_inventory — efficient filtered lookup
-- Supports: full-text search (name/SKU/supplier), category
--           filter, low-stock filter, and LIMIT/OFFSET pagination
-- Used by the frontend ProductPickerModal for live search
-- ============================================================

CREATE OR REPLACE FUNCTION search_inventory(
  p_search    TEXT    DEFAULT '',
  p_category  TEXT    DEFAULT '',
  p_low_stock BOOLEAN DEFAULT FALSE,
  p_limit     INT     DEFAULT 30,
  p_offset    INT     DEFAULT 0
)
RETURNS TABLE (
  inventory_id     UUID,
  product_id       UUID,
  supplier_id      UUID,
  qty_in_stock     INTEGER,
  selling_price    NUMERIC,
  company_price    NUMERIC,
  reorder_level    INTEGER,
  rack_no          TEXT,
  bin_no           TEXT,
  is_genuine       BOOLEAN,
  discount_percent NUMERIC,
  location         TEXT,
  batch_number     TEXT,
  expiry_date      DATE,
  product_name     TEXT,
  product_sku      TEXT,
  product_category TEXT,
  product_unit     TEXT,
  supplier_name    TEXT,
  total_count      BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    i.inventory_id,
    i.product_id,
    i.supplier_id,
    i.qty_in_stock,
    i.selling_price,
    i.company_price,
    i.reorder_level,
    i.rack_no,
    i.bin_no,
    i.is_genuine,
    i.discount_percent,
    i.location,
    i.batch_number,
    i.expiry_date,
    p.name      AS product_name,
    p.sku       AS product_sku,
    p.category  AS product_category,
    p.unit      AS product_unit,
    s.name      AS supplier_name,
    COUNT(*) OVER() AS total_count
  FROM inventory i
  LEFT JOIN products  p ON p.product_id  = i.product_id
  LEFT JOIN suppliers s ON s.supplier_id = i.supplier_id
  WHERE
    (p_search = '' OR (
      p.name ILIKE '%' || p_search || '%' OR
      p.sku  ILIKE '%' || p_search || '%' OR
      s.name ILIKE '%' || p_search || '%'
    ))
    AND (p_category = '' OR p.category = p_category)
    AND (NOT p_low_stock OR i.qty_in_stock <= i.reorder_level)
  ORDER BY p.name, s.name
  LIMIT  p_limit
  OFFSET p_offset
$$;

GRANT EXECUTE ON FUNCTION search_inventory(TEXT, TEXT, BOOLEAN, INT, INT) TO authenticated, service_role;
