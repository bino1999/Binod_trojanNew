# IMS Backend Task Tracker

> Use this file to resume implementation after a session break. Tick off items as they are completed.

## Foundation ✅
- [x] server.js — Express, CORS, Morgan, port 3003
- [x] config/supabase.js — Supabase client with SERVICE_ROLE_KEY
- [x] middleware/auth.js — JWT via supabase.auth.getUser()
- [x] middleware/roleGuard.js — role-based access control

## Services ✅
- [x] services/stockService.js — decrementStock, incrementStock, adjustStock, receivePurchaseOrder

## Auth Routes
- [x] POST /api/auth/login
- [x] GET  /api/auth/me — session refresh (returns id, email, role)

## Products ✅
- [x] GET    /api/products
- [x] GET    /api/products/:id
- [x] POST   /api/products
- [x] PUT    /api/products/:id
- [x] DELETE /api/products/:id (soft deactivate — sets is_active=false)

## Suppliers ✅
- [x] GET    /api/suppliers
- [x] GET    /api/suppliers/:id
- [x] POST   /api/suppliers
- [x] PUT    /api/suppliers/:id
- [x] DELETE /api/suppliers/:id (soft deactivate)
- [x] GET    /api/suppliers/:id/products
- [x] POST   /api/suppliers/:id/products
- [x] DELETE /api/suppliers/:id/products/:pid

## Inventory ✅
- [x] GET /api/inventory
- [x] GET /api/inventory/:id

## Purchases ✅
- [x] GET  /api/purchases
- [x] GET  /api/purchases/:id
- [x] POST /api/purchases
- [x] PUT  /api/purchases/:id      (pending orders only)
- [x] POST /api/purchases/:id/receive
- [x] POST /api/purchases/:id/cancel

## Customers ✅
- [x] GET  /api/customers
- [x] GET  /api/customers/:id
- [x] POST /api/customers
- [x] PUT  /api/customers/:id
- [x] GET  /api/customers/:id/vehicles

## Vehicles ✅
- [x] GET  /api/vehicles
- [x] GET  /api/vehicles/:id
- [x] POST /api/vehicles
- [x] PUT  /api/vehicles/:id       (customer_id immutable after create)

## Internal Use ✅
- [x] GET  /api/internal-use
- [x] GET  /api/internal-use/:id
- [x] POST /api/internal-use       (decrements stock via stockService)

## Service Jobs ✅
- [x] GET    /api/service-jobs
- [x] GET    /api/service-jobs/:id
- [x] POST   /api/service-jobs
- [x] PUT    /api/service-jobs/:id
- [x] POST   /api/service-jobs/:id/items    (decrements stock)
- [x] DELETE /api/service-jobs/:id/items/:itemId  (restores stock)
- [x] POST   /api/service-jobs/:id/complete

## Sales ✅
- [x] GET  /api/sales
- [x] GET  /api/sales/:id
- [x] POST /api/sales              (decrements stock for each item)

## Returns ✅
- [x] GET  /api/returns
- [x] GET  /api/returns/:id
- [x] POST /api/returns            (restores stock for each item)

## Adjustments ✅
- [x] GET  /api/adjustments
- [x] GET  /api/adjustments/:id
- [x] POST /api/adjustments        (adjustStock — positive or negative qty)

## Reports ✅
- [x] GET /api/reports/stock
- [x] GET /api/reports/stock-movement   (aggregates 6 tables, requires ?product_id=)
- [x] GET /api/reports/supplier-purchases
- [x] GET /api/reports/sales
- [x] GET /api/reports/service-jobs
- [x] GET /api/reports/internal-use
- [x] GET /api/reports/returns
- [x] GET /api/reports/profit-margin
- [x] GET /api/reports/low-stock        (JS-side filter: qty_in_stock <= reorder_level)

## Users ✅
- [x] GET    /api/users
- [x] POST   /api/users/invite
- [x] PUT    /api/users/:id
- [x] DELETE /api/users/:id

---

## Next: Frontend Implementation
All backend endpoints are complete. Switch to implementing the frontend pages module by module.
See [CLAUDE.md](CLAUDE.md) for architecture and conventions.
