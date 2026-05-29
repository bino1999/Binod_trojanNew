# Vehicle Service Center — Inventory Management System

## Project Overview

Web-based inventory management system for a vehicle service center. Tracks stock from supplier purchase through to consumption (internal use, service jobs, direct sales) with full returns and write-off handling.

**Project brief:** [project.md](project.md) — full module specs, business rules, field definitions, and workflows

---

## Monorepo Structure

```
trojanNew/
├── frontend/        React 18 + Vite + shadcn/ui + Tailwind
├── backend/         Node.js + Express REST API
├── supabase/        SQL migrations and schema
├── CLAUDE.md
└── project.md
```

---

## Backend Task Status
See [backend_tasks.md](backend_tasks.md) for a live checklist of which endpoints are implemented. Use it to resume after a session break.

## Frontend Task Status
See [frontend_tasks.md](frontend_tasks.md) for a live checklist of which pages and components are implemented. Use it to resume frontend work after a session break.

---

## Running the Project

### Frontend
```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev          # starts on http://localhost:3001
```

### Environment Variables

**backend/.env** — fill in when Supabase project is ready:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
PORT=3003
```

**frontend/.env** — fill in when Supabase project is ready:
```
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Architecture

### Request Flow
```
Browser → React frontend → Express backend → Supabase (PostgreSQL)
```

The frontend never talks directly to Supabase for data — all reads and writes go through the Express API. Supabase Auth JWTs are verified in Express middleware.

### Auth
- Supabase Auth issues JWTs on login.
- Frontend stores JWT in Zustand (`authStore`) and sends it as `Authorization: Bearer <token>` on every API request.
- Express `auth` middleware verifies the JWT using the Supabase service role key.
- Express `roleGuard` middleware enforces role-based access per route.

### Stock Mutation Rule
All changes to `inventory.qty_in_stock` go through `backend/src/services/stockService.js` — never via direct DB calls from controllers. This ensures audit consistency.

| Operation | Stock effect |
|---|---|
| Purchase order received | `+= qty_received` |
| Internal use saved | `-= qty_used` |
| Service job item added | `-= qty_used` |
| Sale confirmed | `-= qty_sold` |
| Return saved | `+= qty_returned` |
| Adjustment saved | `+= qty_adjusted` (negative = write-off) |

### Selling Price Rule
Selling price is **always locked** to `inventory.selling_price` at the time of the transaction. No overrides at point of sale.

---

## Modules

| Module | Route prefix | Roles |
|---|---|---|
| Product master | `/api/products` | All |
| Supplier management | `/api/suppliers` | Admin, Manager, Warehouse |
| Inventory | `/api/inventory` | All |
| Purchase orders | `/api/purchases` | Admin, Manager, Warehouse |
| Internal use | `/api/internal-use` | Admin, Manager, Warehouse, Technician |
| Service jobs | `/api/service-jobs` | Admin, Manager, Technician |
| Direct sales | `/api/sales` | Admin, Manager, Cashier |
| Returns | `/api/returns` | Admin, Manager, Cashier |
| Stock adjustments | `/api/adjustments` | Admin, Manager, Warehouse |
| Reports | `/api/reports` | Admin, Manager |
| Users | `/api/users` | Admin only |

---

## User Roles

| Role | Key access |
|---|---|
| `admin` | Full access + user management |
| `manager` | All modules, all reports |
| `cashier` | Sales, returns, view inventory |
| `technician` | View + consume on assigned jobs |
| `warehouse` | Purchase orders, inventory, adjustments |

---

## Database

Schema lives in `supabase/migrations/001_initial_schema.sql`. Run via Supabase CLI or paste into the Supabase SQL editor.

### Core tables
`user_profiles`, `products`, `suppliers`, `supplier_products`, `inventory`, `purchase_orders`, `purchase_order_items`, `internal_use_records`, `customers`, `vehicles`, `service_jobs`, `service_job_items`, `sales`, `sale_items`, `returns`, `return_items`, `stock_adjustments`

---

## Key Conventions

- Page components live in `frontend/src/pages/<module>/index.jsx`
- Shared UI components (shadcn) live in `frontend/src/components/ui/`
- Layout components live in `frontend/src/components/layout/`
- Data-fetching hooks live in `frontend/src/hooks/`
- API calls use the axios instance from `frontend/src/lib/api.js`
- Backend route files are thin — logic goes in controllers, DB logic goes in services
- No tax/VAT calculations in v1
- No selling price override at POS
- Partial returns are supported (item + qty selection)
