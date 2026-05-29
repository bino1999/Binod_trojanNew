# IMS Frontend Task Tracker

> Use this file to resume frontend implementation after a session break. Tick off items as they are completed.
> See [CLAUDE.md](CLAUDE.md) for architecture, conventions, and running instructions.

---

## Step 0 — Setup ✅
- [x] `frontend_tasks.md` created
- [x] `CLAUDE.md` updated with Frontend Task Status section

---

## Step 1 — Shared Components ✅
- [x] `components/ui/button.jsx`
- [x] `components/ui/badge.jsx` — status badge variants (default, success, warning, destructive, info, muted)
- [x] `components/ui/input.jsx`
- [x] `components/ui/label.jsx`
- [x] `components/ui/textarea.jsx`
- [x] `components/ui/dialog.jsx`
- [x] `components/ui/alert-dialog.jsx`
- [x] `components/ui/select.jsx`
- [x] `components/ui/tabs.jsx`
- [x] `components/ui/toast.jsx` + `toaster.jsx`
- [x] `hooks/use-toast.js` — global ToastContextProvider + `toast()` imperative helper
- [x] `main.jsx` — wrapped with ToastContextProvider + Toaster
- [x] `components/shared/DataTable.jsx` — table with search input + filter slot
- [x] `components/shared/ConfirmDialog.jsx` — delete/confirm dialog (Radix AlertDialog)
- [x] `components/shared/PageHeader.jsx` — page title + action button slot

---

## Step 2 — Dashboard ✅ (`pages/dashboard/index.jsx`)
- [x] 4 stat cards (Total Products, Low Stock, Open Jobs, Today's Sales)
- [x] Low stock alert list
- [x] Recent purchases, service jobs, and sales feeds

---

## Step 3 — Products ✅ (`pages/products/index.jsx`)
- [x] Product table with search + category filter
- [x] Add/Edit modal (name, SKU, category, unit, cost_price, selling_price, reorder_level)
- [x] Soft-delete with ConfirmDialog

---

## Step 4 — Suppliers ✅ (`pages/suppliers/index.jsx`)
- [x] Supplier table (expandable rows)
- [x] Add/Edit modal
- [x] Linked products panel per supplier (list, link, unlink)
- [x] Soft-delete with ConfirmDialog

---

## Step 5 — Inventory ✅ (`pages/inventory/index.jsx`)
- [x] Read-only stock table with low-stock row highlight (yellow)
- [x] Low-stock banner with count
- [x] Search by name/SKU + low-stock toggle filter

---

## Step 6 — Purchases ✅ (`pages/purchases/index.jsx`)
- [x] Purchase orders list with status badge + status filter
- [x] New PO modal (supplier + line items + total)
- [x] PO detail modal (items, receive button, cancel button)
- [x] Status flow: pending → received / cancelled (stock updated on receive)

---

## Step 7 — Customers & Vehicles ✅
- [x] `pages/customers/index.jsx` — CRUD table with expandable vehicle panel
- [x] Customer add/edit modal
- [x] Vehicle add/edit modal inside customer row
- [x] `/customers` route added to `App.jsx` and Sidebar

---

## Step 8 — Internal Use ✅ (`pages/internal-use/index.jsx`)
- [x] Usage log table
- [x] New record modal (product, qty, purpose, notes)
- [x] Stock warning when qty > current stock

---

## Step 9 — Service Jobs ✅ (`pages/service-jobs/index.jsx`)
- [x] Job list with status badge + status filter
- [x] New job modal (customer, vehicle, technician, notes)
- [x] Job detail modal: items table, add item (decrements stock), remove item (restores stock)
- [x] Complete job button

---

## Step 10 — Sales ✅ (`pages/sales/index.jsx`)
- [x] Sales list
- [x] New sale modal (optional customer, line items, selling price locked, total display)
- [x] Sale detail view (read-only)

---

## Step 11 — Returns ✅ (`pages/returns/index.jsx`)
- [x] Returns list
- [x] New return modal (select original sale, item + qty selection, reason)
- [x] Return detail view

---

## Step 12 — Adjustments ✅ (`pages/adjustments/index.jsx`)
- [x] Adjustment log table (positive = add, negative = write-off highlighted red)
- [x] New adjustment modal (product, qty, reason, notes required when reason=other)

---

## Step 13 — Reports ✅ (`pages/reports/index.jsx`)
- [x] 8-tab navigation
- [x] Stock snapshot report
- [x] Stock movement report (product selector + date range)
- [x] Supplier purchases report + bar chart
- [x] Sales report + line chart
- [x] Service jobs report
- [x] Internal use report
- [x] Returns report
- [x] Profit margin + Low stock alerts

---

## Step 14 — Users ✅ (`pages/users/index.jsx`)
- [x] User table (email, role badge, status, joined date)
- [x] Invite user modal (email + role)
- [x] Edit role modal
- [x] Deactivate user with ConfirmDialog

---

## All frontend tasks complete ✅

---

## Notes
- All API calls go through `frontend/src/lib/api.js` (axios, Bearer token auto-injected)
- Data fetching via React Query (`useQuery` / `useMutation`)
- Role checks via `useAuthStore()` — action buttons hidden for restricted roles
- Toast notifications: use `toast()` from `@/hooks/use-toast` for all mutations
- PropTypes warnings from SonarQube linter are expected — project does not use PropTypes
