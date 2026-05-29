# Vehicle Service Center — Inventory Management System
## Project Brief

**Version:** 1.0  
**Stack:** React · Node.js · Supabase  
**Date:** May 2026

---

## 1. Project Overview

A web-based inventory management system for a vehicle service center that sells vehicle products and performs vehicle servicing. The system tracks stock from supplier purchase through to consumption — whether through internal workshop use, customer service jobs, or direct product sales — and handles returns automatically.

---

## 2. Core Business Rules

- Inventory is filled **only** through supplier purchases. There is no other inbound stock path except automated customer return restocking.
- Every item in inventory is linked to the **product master table**, which is the single source of truth for item names and categories.
- When stock is purchased from a supplier, the user selects from the product master and adds purchase-specific data (company price, selling price, quantity, etc.).
- The same item can be supplied by **multiple suppliers at different prices**. The system must record which supplier each purchase came from and at what price.
- Items leave inventory through exactly **three channels**: internal use, service jobs, and direct sales.
- Customer returns are **automatically restocked** to inventory with the original selling price preserved and a return record created for audit purposes.

---

## 3. Modules

### 3.1 Product Master

Central reference table for all items/products. This is populated independently and used as a lookup when recording purchases or transactions.

**Fields:**
| Field | Type | Notes |
|---|---|---|
| `product_id` | UUID (PK) | |
| `name` | String | e.g. "Engine Oil 5W-30" |
| `category` | String | e.g. Lubricants, Filters, Tyres, Brakes |
| `unit` | String | e.g. Litre, Piece, Set |
| `description` | Text | Optional |
| `is_active` | Boolean | Soft delete / hide discontinued items |
| `created_at` | Timestamp | |

---

### 3.2 Supplier Management

Stores supplier details. One supplier can supply many items, and one item can come from many suppliers.

**Fields — `suppliers` table:**
| Field | Type | Notes |
|---|---|---|
| `supplier_id` | UUID (PK) | |
| `name` | String | Company name |
| `contact_person` | String | |
| `phone` | String | |
| `email` | String | |
| `address` | Text | |
| `is_active` | Boolean | |
| `created_at` | Timestamp | |

**Fields — `supplier_products` table** (many-to-many between suppliers and products):
| Field | Type | Notes |
|---|---|---|
| `supplier_product_id` | UUID (PK) | |
| `supplier_id` | UUID (FK) | |
| `product_id` | UUID (FK) | |
| `default_company_price` | Decimal | Last known purchase price from this supplier |
| `notes` | Text | Optional |

---

### 3.3 Inventory

The live stock ledger. Each record represents a batch of a product with its associated pricing from a specific purchase.

**Fields — `inventory` table:**
| Field | Type | Notes |
|---|---|---|
| `inventory_id` | UUID (PK) | |
| `product_id` | UUID (FK → products) | |
| `supplier_id` | UUID (FK → suppliers) | The supplier this batch came from |
| `purchase_order_id` | UUID (FK → purchase_orders) | |
| `qty_in_stock` | Integer | Live quantity, decremented on use/sale |
| `company_price` | Decimal | Price paid to supplier (cost price) |
| `selling_price` | Decimal | Price charged to customer |
| `profit_margin` | Decimal (computed) | selling_price − company_price |
| `reorder_level` | Integer | Alert threshold for low stock |
| `location` | String | Optional shelf/bin location |
| `batch_number` | String | Optional, for traceability |
| `expiry_date` | Date | Optional, for relevant products |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

---

### 3.4 Purchase Orders (Stock In)

Records every purchase from a supplier. This is the only way inventory is filled.

**Fields — `purchase_orders` table:**
| Field | Type | Notes |
|---|---|---|
| `purchase_order_id` | UUID (PK) | |
| `supplier_id` | UUID (FK) | |
| `order_date` | Date | |
| `received_date` | Date | |
| `status` | Enum | pending / received / cancelled |
| `invoice_number` | String | Supplier invoice reference |
| `total_amount` | Decimal | Computed from line items |
| `notes` | Text | |
| `created_by` | UUID (FK → users) | |
| `created_at` | Timestamp | |

**Fields — `purchase_order_items` table:**
| Field | Type | Notes |
|---|---|---|
| `po_item_id` | UUID (PK) | |
| `purchase_order_id` | UUID (FK) | |
| `product_id` | UUID (FK) | Selected from product master |
| `qty_ordered` | Integer | |
| `qty_received` | Integer | May differ from ordered |
| `company_price` | Decimal | Price per unit from supplier |
| `selling_price` | Decimal | Selling price set at time of purchase |

**Flow:** When a purchase order is marked as `received`, the system automatically creates or updates inventory records for each line item.

---

### 3.5 Internal Use

Records items consumed within the workshop for non-billable purposes (e.g. cleaning materials, workshop consumables, staff use).

**Fields — `internal_use_records` table:**
| Field | Type | Notes |
|---|---|---|
| `internal_use_id` | UUID (PK) | |
| `inventory_id` | UUID (FK) | |
| `product_id` | UUID (FK) | |
| `qty_used` | Integer | Decrements `qty_in_stock` |
| `purpose` | String | e.g. "Workshop cleaning", "Staff use" |
| `used_by` | UUID (FK → users) | |
| `date_used` | Date | |
| `notes` | Text | |
| `created_at` | Timestamp | |

---

### 3.6 Service Jobs

Full job card management. A vehicle comes in for service, a job card is created, items are consumed from inventory, and the job is billed.

**Fields — `customers` table:**
| Field | Type | Notes |
|---|---|---|
| `customer_id` | UUID (PK) | |
| `name` | String | |
| `phone` | String | |
| `email` | String | |
| `address` | Text | |
| `created_at` | Timestamp | |

**Fields — `vehicles` table:**
| Field | Type | Notes |
|---|---|---|
| `vehicle_id` | UUID (PK) | |
| `customer_id` | UUID (FK) | |
| `plate_number` | String | |
| `make` | String | e.g. Toyota |
| `model` | String | e.g. Corolla |
| `year` | Integer | |
| `color` | String | |
| `mileage_in` | Integer | At time of job |
| `created_at` | Timestamp | |

**Fields — `service_jobs` table:**
| Field | Type | Notes |
|---|---|---|
| `job_id` | UUID (PK) | |
| `job_number` | String | Human-readable reference e.g. JOB-0042 |
| `customer_id` | UUID (FK) | |
| `vehicle_id` | UUID (FK) | |
| `assigned_technician` | UUID (FK → users) | |
| `job_date` | Date | |
| `status` | Enum | open / in-progress / completed / invoiced |
| `labor_description` | Text | Description of work done |
| `labor_cost` | Decimal | |
| `total_parts_cost` | Decimal | Computed from job items |
| `total_amount` | Decimal | labor + parts |
| `notes` | Text | |
| `created_at` | Timestamp | |

**Fields — `service_job_items` table:**
| Field | Type | Notes |
|---|---|---|
| `job_item_id` | UUID (PK) | |
| `job_id` | UUID (FK) | |
| `inventory_id` | UUID (FK) | |
| `product_id` | UUID (FK) | |
| `qty_used` | Integer | Decrements `qty_in_stock` |
| `unit_price` | Decimal | Selling price at time of use |
| `line_total` | Decimal | qty × unit_price |

---

### 3.7 Direct Sales

For walk-in customers purchasing products over the counter without a service job.

**Fields — `sales` table:**
| Field | Type | Notes |
|---|---|---|
| `sale_id` | UUID (PK) | |
| `sale_number` | String | e.g. SALE-0101 |
| `customer_id` | UUID (FK, nullable) | Optional — walk-ins may be anonymous |
| `sale_date` | Date | |
| `total_amount` | Decimal | Computed from line items |
| `payment_method` | Enum | cash / card / transfer |
| `notes` | Text | |
| `created_by` | UUID (FK → users) | |
| `created_at` | Timestamp | |

**Fields — `sale_items` table:**
| Field | Type | Notes |
|---|---|---|
| `sale_item_id` | UUID (PK) | |
| `sale_id` | UUID (FK) | |
| `inventory_id` | UUID (FK) | |
| `product_id` | UUID (FK) | |
| `qty_sold` | Integer | Decrements `qty_in_stock` |
| `unit_price` | Decimal | Selling price at time of sale |
| `line_total` | Decimal | |

---

### 3.8 Returns

Handles items returned by customers after a direct sale or a service job. Stock is automatically restocked to inventory.

**Fields — `returns` table:**
| Field | Type | Notes |
|---|---|---|
| `return_id` | UUID (PK) | |
| `return_number` | String | e.g. RET-0012 |
| `source_type` | Enum | `sale` / `service_job` |
| `source_id` | UUID | Points to `sale_id` or `job_id` |
| `customer_id` | UUID (FK, nullable) | |
| `return_date` | Date | |
| `reason` | Text | |
| `total_refund_amount` | Decimal | |
| `processed_by` | UUID (FK → users) | |
| `created_at` | Timestamp | |

**Fields — `return_items` table:**
| Field | Type | Notes |
|---|---|---|
| `return_item_id` | UUID (PK) | |
| `return_id` | UUID (FK) | |
| `inventory_id` | UUID (FK) | |
| `product_id` | UUID (FK) | |
| `qty_returned` | Integer | Added back to `qty_in_stock` |
| `unit_price` | Decimal | Original selling price refunded |
| `line_total` | Decimal | |

**Business rule:** When a return is saved, the system increments `qty_in_stock` on the corresponding inventory record automatically (via a Supabase trigger or Node.js service layer).

---

## 4. User Roles

| Role | Permissions |
|---|---|
| **Admin** | Full access — all modules, user management, reports |
| **Manager** | All modules except user management |
| **Cashier / Sales** | Direct sales, view inventory, process returns |
| **Technician** | View and consume items on assigned service jobs |
| **Warehouse** | Purchase orders, inventory management, stock adjustments |

---

## 5. Key Workflows

### Receiving Stock
1. Create a purchase order, select supplier.
2. Add line items — search product master, enter qty, company price, selling price.
3. Mark order as `received` → system creates inventory records automatically.

### Processing a Service Job
1. Create job card — select or create customer and vehicle.
2. Add items consumed — search inventory, enter qty → stock decrements live.
3. Add labor description and cost.
4. Mark job as `completed` → generate invoice.

### Direct Sale
1. Open new sale, optionally attach a customer.
2. Add items from inventory — qty and price populated from stock.
3. Confirm sale → stock decrements, receipt generated.

### Processing a Return
1. Look up original sale or job by number.
2. Select item(s) and qty to return, enter reason.
3. Save → stock auto-increments, refund record created.

---

## 6. Reporting & Analytics

The following reports should be available to managers and admins:

- **Stock report** — current inventory levels, items below reorder threshold
- **Stock movement report** — all in/out transactions for any item over a date range
- **Supplier purchase history** — purchases per supplier, total spend
- **Sales report** — revenue by date range, by product, by channel (sale vs service)
- **Service job summary** — jobs completed, labor revenue, parts revenue
- **Internal use summary** — items consumed internally by period
- **Returns report** — return rate by product, total refund value
- **Profit margin report** — company price vs selling price per item/category
- **Low stock alerts** — items at or below reorder level

---

## 7. Tech Stack & Architecture

| Layer | Technology |
|---|---|
| Frontend | React (with React Router, Context or Zustand for state) |
| Backend | Node.js + Express (REST API) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (with role-based access) |
| Hosting | TBD |

**Recommended project structure:**

```
/client          → React frontend
  /src
    /pages       → one folder per module (inventory, sales, jobs, etc.)
    /components  → shared UI components
    /hooks       → data-fetching hooks
    /context     → global state

/server          → Node.js backend
  /routes        → one file per module
  /controllers
  /services      → business logic (e.g. stock decrement, return restocking)
  /middleware    → auth, role checks

/supabase
  /migrations    → SQL migration files
  /functions     → edge functions if needed
```

**Notes on Supabase usage:**
- Use **Row Level Security (RLS)** policies to enforce role-based access at the database level.
- Use **database triggers** or the Node.js service layer for automated actions like restocking on return and decrementing stock on sale/job save.
- Use **realtime subscriptions** optionally for live stock level updates on the inventory screen.

---

## 8. Out of Scope (v1)

The following are explicitly excluded from version 1 to keep scope manageable:

- Accounting / bookkeeping integration
- Online customer portal
- Multi-branch / multi-location support
- Barcode / QR scanning
- Vehicle service history (beyond what is captured in job cards)
- SMS / email notifications to customers
- Mobile app

These can be considered for future versions once the core system is stable.

---

## 9. Open Questions to Resolve Before Development

1. **Stock adjustment / write-off** — how should damaged or lost stock be handled? Should there be a manual adjustment feature with a reason code?
2. **Partial returns** — is a customer allowed to return only some items from a sale/job, or must the full transaction be returned? *(The schema supports partial returns, but the UI flow needs a decision.)*
3. **Multiple selling prices** — can a manager override the selling price at point of sale, or is it fixed from the inventory record?
4. **Tax** — does the system need to calculate and display VAT or other taxes on invoices?
5. **Invoice printing** — should the system generate a printable PDF invoice for service jobs and sales?

---

*End of brief — v1.0*