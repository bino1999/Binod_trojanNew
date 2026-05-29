-- ============================================================
-- IMS Seed Data — Vehicle Service Center
-- Run AFTER 001_initial_schema.sql on an empty database.
--
-- NOTE: user_profiles rows require Supabase Auth users to exist
-- first. Create users via Supabase dashboard / invite endpoint,
-- then link them. All created_by / used_by / assigned_technician
-- columns are left NULL in this seed so it can run independently.
--
-- All prices are in LKR (Sri Lankan Rupees).
-- Stock quantities in inventory reflect the net after all
-- transactions recorded below (purchases – outflows + returns).
-- ============================================================

-- ============================================================
-- PRODUCTS  (12 items)
-- ============================================================
INSERT INTO products (product_id, name, category, unit, description) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Engine Oil 5W-30',   'Lubricants',  'Litre', 'Fully synthetic engine oil, petrol engines'),
  ('aaaaaaaa-0001-0000-0000-000000000002', 'Engine Oil 10W-40',  'Lubricants',  'Litre', 'Semi-synthetic engine oil, petrol/diesel'),
  ('aaaaaaaa-0001-0000-0000-000000000003', 'Oil Filter',         'Filters',     'Piece', 'Universal spin-on oil filter'),
  ('aaaaaaaa-0001-0000-0000-000000000004', 'Air Filter',         'Filters',     'Piece', 'Panel air filter element'),
  ('aaaaaaaa-0001-0000-0000-000000000005', 'Fuel Filter',        'Filters',     'Piece', 'Inline fuel filter'),
  ('aaaaaaaa-0001-0000-0000-000000000006', 'Brake Pads Front',   'Brakes',      'Set',   'Front disc brake pad set (OEM spec)'),
  ('aaaaaaaa-0001-0000-0000-000000000007', 'Brake Pads Rear',    'Brakes',      'Set',   'Rear disc brake pad set (OEM spec)'),
  ('aaaaaaaa-0001-0000-0000-000000000008', 'Brake Fluid DOT4',   'Fluids',      'Litre', 'DOT4 hydraulic brake fluid'),
  ('aaaaaaaa-0001-0000-0000-000000000009', 'Coolant 50% Mix',    'Fluids',      'Litre', 'Pre-mixed ethylene glycol coolant'),
  ('aaaaaaaa-0001-0000-0000-000000000010', 'Wiper Blades',       'Accessories', 'Pair',  'Front wiper blade set'),
  ('aaaaaaaa-0001-0000-0000-000000000011', 'Spark Plugs NGK',    'Ignition',    'Set',   'NGK iridium spark plug set (4 pcs)'),
  ('aaaaaaaa-0001-0000-0000-000000000012', 'Timing Belt Kit',    'Engine',      'Set',   'Timing belt + tensioner + idler pulley kit');

-- ============================================================
-- SUPPLIERS  (3 suppliers)
-- ============================================================
INSERT INTO suppliers (supplier_id, name, contact_person, phone, email, address) VALUES
  ('bbbbbbbb-0001-0000-0000-000000000001', 'AutoParts Lanka Pvt Ltd',    'Sunil Bandara',   '0112-345678', 'sunil@autopartslanka.lk',  '45 Baseline Road, Colombo 09'),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'Peiris Automotive Supplies', 'Ranjith Peiris',  '0773-456789', 'ranjith@peirisauto.lk',    '12 Old Moor Street, Colombo 12'),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'Lanka Motor Traders',        'Chaminda Herath', '0812-567890', 'chaminda@lankamotors.lk',  '78 Peradeniya Road, Kandy');

-- ============================================================
-- SUPPLIER ↔ PRODUCT LINKS
-- ============================================================
INSERT INTO supplier_products (supplier_id, product_id, default_company_price, notes) VALUES
  -- AutoParts Lanka
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001',  850.00, 'Ships in cases of 12'),
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000002',  680.00, NULL),
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000003',  350.00, NULL),
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000006', 1850.00, 'OEM quality'),
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000007', 1750.00, 'OEM quality'),
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000008',  480.00, NULL),
  -- Peiris Automotive
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000004',  320.00, NULL),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000005',  280.00, NULL),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000009',  520.00, NULL),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000010',  450.00, NULL),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000011', 1600.00, 'NGK authorised distributor'),
  -- Lanka Motor Traders
  ('bbbbbbbb-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000012', 4200.00, 'Genuine parts only'),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000001',  820.00, 'Bulk discount available'),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000002',  660.00, NULL);

-- ============================================================
-- CUSTOMERS  (5 customers)
-- ============================================================
INSERT INTO customers (customer_id, name, phone, email, address) VALUES
  ('cccccccc-0001-0000-0000-000000000001', 'Kamal Perera',          '0711-234567', 'kamal.perera@gmail.com',    '23 Galle Road, Colombo 03'),
  ('cccccccc-0001-0000-0000-000000000002', 'Nimal Silva',           '0722-345678', 'nimal.silva@yahoo.com',     '8 Temple Road, Nugegoda'),
  ('cccccccc-0001-0000-0000-000000000003', 'Suresh Fernando',       '0765-456789', 'suresh.f@hotmail.com',      '15 Station Road, Maharagama'),
  ('cccccccc-0001-0000-0000-000000000004', 'Priyantha Jayawardena', '0778-567890', 'priyantha.j@gmail.com',     '47 Dutugemunu Street, Dehiwala'),
  ('cccccccc-0001-0000-0000-000000000005', 'Ruwan Wickramasinghe',  '0755-678901', 'ruwan.w@gmail.com',         '9 Sri Jayawardenepura Mawatha, Kotte');

-- ============================================================
-- VEHICLES  (6 vehicles across 5 customers)
-- ============================================================
INSERT INTO vehicles (vehicle_id, customer_id, plate_number, make, model, year, color, mileage_in) VALUES
  ('dddddddd-0001-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001', 'CAB-1234', 'Toyota',     'Corolla',   2019, 'White',       45200),
  ('dddddddd-0001-0000-0000-000000000002', 'cccccccc-0001-0000-0000-000000000001', 'CAB-5678', 'Honda',      'Civic',     2021, 'Black',       22100),
  ('dddddddd-0001-0000-0000-000000000003', 'cccccccc-0001-0000-0000-000000000002', 'CBB-3456', 'Toyota',     'Prius',     2020, 'Silver',      38700),
  ('dddddddd-0001-0000-0000-000000000004', 'cccccccc-0001-0000-0000-000000000003', 'CCB-7890', 'Suzuki',     'Swift',     2018, 'Blue',        61500),
  ('dddddddd-0001-0000-0000-000000000005', 'cccccccc-0001-0000-0000-000000000004', 'CDC-2345', 'Nissan',     'X-Trail',   2017, 'Grey',        87300),
  ('dddddddd-0001-0000-0000-000000000006', 'cccccccc-0001-0000-0000-000000000005', 'CEB-6789', 'Mitsubishi', 'Outlander', 2016, 'Pearl White', 103400);

-- ============================================================
-- PURCHASE ORDERS
-- PO1 (received), PO2 (received), PO3 (pending)
-- ============================================================
INSERT INTO purchase_orders (purchase_order_id, supplier_id, order_date, received_date, status, invoice_number, total_amount, notes) VALUES
  ('eeeeeeee-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', '2026-05-02', '2026-05-05', 'received', 'INV-APL-0145', 52400.00, 'Monthly lubricants & brakes restock'),
  ('eeeeeeee-0001-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000002', '2026-05-08', '2026-05-10', 'received', 'INV-PAU-0067', 31200.00, 'Filters and ignition top-up'),
  ('eeeeeeee-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000003', '2026-05-20', NULL,         'pending',  'INV-LMT-0023',  NULL,    'Timing belt kits for upcoming jobs');

-- ============================================================
-- PURCHASE ORDER ITEMS
-- ============================================================
INSERT INTO purchase_order_items (po_item_id, purchase_order_id, product_id, qty_ordered, qty_received, company_price, selling_price) VALUES
  -- PO1: AutoParts Lanka (received)
  ('ffffffff-0001-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 20, 20,  850.00, 1200.00),  -- Engine Oil 5W-30
  ('ffffffff-0001-0000-0000-000000000002', 'eeeeeeee-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000003', 15, 15,  350.00,  550.00),  -- Oil Filter
  ('ffffffff-0001-0000-0000-000000000003', 'eeeeeeee-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000006',  8,  8, 1850.00, 2800.00),  -- Brake Pads Front
  -- PO2: Peiris Automotive (received)
  ('ffffffff-0001-0000-0000-000000000004', 'eeeeeeee-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000004', 12, 12,  320.00,  520.00),  -- Air Filter
  ('ffffffff-0001-0000-0000-000000000005', 'eeeeeeee-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000011', 10, 10, 1600.00, 2500.00),  -- Spark Plugs NGK
  ('ffffffff-0001-0000-0000-000000000006', 'eeeeeeee-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000010',  8,  8,  450.00,  750.00),  -- Wiper Blades
  -- PO3: Lanka Motor Traders (pending — qty_received = 0)
  ('ffffffff-0001-0000-0000-000000000007', 'eeeeeeee-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000012',  5,  0, 4200.00, 6500.00),  -- Timing Belt Kit
  ('ffffffff-0001-0000-0000-000000000008', 'eeeeeeee-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000002', 10,  0,  660.00,  980.00);  -- Engine Oil 10W-40

-- ============================================================
-- INVENTORY  (net stock = received – all outflows + returns)
--
-- Engine Oil 5W-30:  received 20 – service job 4 – sold 2 – internal 1 = 13
-- Oil Filter:        received 15 – service job 1                        = 14
-- Brake Pads Front:  received  8                                        =  8
-- Air Filter:        received 12 – damaged adj 1                        = 11
-- Spark Plugs NGK:   received 10 – sold 1                               =  9
-- Wiper Blades:      received  8 – sold 1 + returned 1                  =  8
-- ============================================================
INSERT INTO inventory (inventory_id, product_id, supplier_id, purchase_order_id, qty_in_stock, company_price, selling_price, reorder_level, location) VALUES
  ('11111111-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', 13,  850.00, 1200.00, 5, 'Shelf A-1'),
  ('11111111-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001', 14,  350.00,  550.00, 5, 'Shelf A-2'),
  ('11111111-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000006', 'bbbbbbbb-0001-0000-0000-000000000001', 'eeeeeeee-0001-0000-0000-000000000001',  8, 1850.00, 2800.00, 3, 'Shelf B-1'),
  ('11111111-0001-0000-0000-000000000004', 'aaaaaaaa-0001-0000-0000-000000000004', 'bbbbbbbb-0001-0000-0000-000000000002', 'eeeeeeee-0001-0000-0000-000000000002', 11,  320.00,  520.00, 5, 'Shelf A-3'),
  ('11111111-0001-0000-0000-000000000005', 'aaaaaaaa-0001-0000-0000-000000000011', 'bbbbbbbb-0001-0000-0000-000000000002', 'eeeeeeee-0001-0000-0000-000000000002',  9, 1600.00, 2500.00, 4, 'Shelf C-1'),
  ('11111111-0001-0000-0000-000000000006', 'aaaaaaaa-0001-0000-0000-000000000010', 'bbbbbbbb-0001-0000-0000-000000000002', 'eeeeeeee-0001-0000-0000-000000000002',  8,  450.00,  750.00, 3, 'Shelf D-1');

-- ============================================================
-- SERVICE JOBS
-- job_number is auto-generated by trigger — do NOT include it
-- total_parts_cost is updated by trigger after items are inserted
-- total_amount is a GENERATED column (labor + parts)
-- ============================================================
INSERT INTO service_jobs (job_id, customer_id, vehicle_id, job_date, status, labor_description, labor_cost, notes) VALUES
  ('44444444-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000001', 'dddddddd-0001-0000-0000-000000000001',
   '2026-05-13', 'completed',
   'Full engine oil change with filter replacement. Oil flushed, new 5W-30 synthetic filled (4L).',
   1500.00, 'Customer reported slight oil burning smell — resolved after flush'),

  ('44444444-0001-0000-0000-000000000002',
   'cccccccc-0001-0000-0000-000000000002', 'dddddddd-0001-0000-0000-000000000003',
   '2026-05-21', 'in-progress',
   'Front and rear brake pad inspection. Front pads worn — replacement in progress.',
   2000.00, NULL),

  ('44444444-0001-0000-0000-000000000003',
   'cccccccc-0001-0000-0000-000000000003', 'dddddddd-0001-0000-0000-000000000004',
   '2026-05-26', 'open',
   'Scheduled full service — oil change, filter check, brake inspection, tyre rotation.',
   3500.00, 'Customer requested completed by end of day');

-- ============================================================
-- SERVICE JOB ITEMS  (only Job 1 — completed)
-- line_total is a GENERATED column — do NOT include it
-- trigger will update service_jobs.total_parts_cost automatically
-- ============================================================
INSERT INTO service_job_items (job_item_id, job_id, inventory_id, product_id, qty_used, unit_price) VALUES
  ('55555555-0001-0000-0000-000000000001',
   '44444444-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001',
   4, 1200.00),  -- Engine Oil 5W-30, 4L

  ('55555555-0001-0000-0000-000000000002',
   '44444444-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000003',
   1,  550.00);  -- Oil Filter ×1

-- ============================================================
-- DIRECT SALES
-- sale_number is auto-generated by trigger — do NOT include it
-- ============================================================
INSERT INTO sales (sale_id, customer_id, sale_date, total_amount, payment_method, notes) VALUES
  ('22222222-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000002',
   '2026-05-12', 3150.00, 'cash', 'Walk-in parts purchase — Nimal Silva'),

  ('22222222-0001-0000-0000-000000000002',
   'cccccccc-0001-0000-0000-000000000004',
   '2026-05-18', 2500.00, 'card', NULL);

-- ============================================================
-- SALE ITEMS
-- line_total is a GENERATED column — do NOT include it
-- ============================================================
INSERT INTO sale_items (sale_item_id, sale_id, inventory_id, product_id, qty_sold, unit_price) VALUES
  -- Sale 1 (Nimal): Wiper Blades ×1 + Engine Oil 5W-30 ×2
  ('33333333-0001-0000-0000-000000000001',
   '22222222-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000006', 'aaaaaaaa-0001-0000-0000-000000000010',
   1, 750.00),   -- Wiper Blades ×1 = 750

  ('33333333-0001-0000-0000-000000000002',
   '22222222-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001',
   2, 1200.00),  -- Engine Oil 5W-30 ×2 = 2400  (total: 3150)

  -- Sale 2 (Priyantha): Spark Plugs NGK ×1
  ('33333333-0001-0000-0000-000000000003',
   '22222222-0001-0000-0000-000000000002',
   '11111111-0001-0000-0000-000000000005', 'aaaaaaaa-0001-0000-0000-000000000011',
   1, 2500.00);  -- Spark Plugs NGK ×1 = 2500

-- ============================================================
-- INTERNAL USE RECORDS
-- ============================================================
INSERT INTO internal_use_records (internal_use_id, inventory_id, product_id, qty_used, purpose, date_used, notes) VALUES
  ('66666666-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001',
   1, 'Workshop engine flush — cleaning equipment run', '2026-05-15',
   'Used during lift maintenance, not billable');

-- ============================================================
-- RETURNS
-- return_number is auto-generated by trigger — do NOT include it
-- source_type 'sale' → source_id = sale_id
-- ============================================================
INSERT INTO returns (return_id, source_type, source_id, customer_id, return_date, reason, total_refund_amount) VALUES
  ('77777777-0001-0000-0000-000000000001',
   'sale', '22222222-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000002',
   '2026-05-14', 'Wrong size — customer purchased incorrect wiper blade size', 750.00);

-- ============================================================
-- RETURN ITEMS
-- line_total is a GENERATED column — do NOT include it
-- ============================================================
INSERT INTO return_items (return_item_id, return_id, inventory_id, product_id, qty_returned, unit_price) VALUES
  ('88888888-0001-0000-0000-000000000001',
   '77777777-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000006', 'aaaaaaaa-0001-0000-0000-000000000010',
   1, 750.00);  -- Wiper Blades ×1 returned at original sale price

-- ============================================================
-- STOCK ADJUSTMENTS
-- ============================================================
INSERT INTO stock_adjustments (adjustment_id, inventory_id, product_id, qty_adjusted, reason, notes, date_adjusted) VALUES
  ('99999999-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000004', 'aaaaaaaa-0001-0000-0000-000000000004',
   -1, 'damaged', 'Water damage — air filter found wet in storage area after roof leak', '2026-05-16');
