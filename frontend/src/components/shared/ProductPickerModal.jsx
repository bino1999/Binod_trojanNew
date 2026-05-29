import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Search, Check } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const CATEGORIES = [
  'Oil & Fluids', 'Filters', 'Brakes', 'Tyres',
  'Electrical', 'Body Parts', 'Consumables', 'Other',
]

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function StockBadge({ qty, reorderLevel }) {
  if (qty === 0)
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">Out of stock</span>
  if (reorderLevel && qty <= reorderLevel)
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">Low · {qty}</span>
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">{qty} in stock</span>
}

/**
 * Shared product picker modal used by Sales, Service Jobs, and Internal Use.
 *
 * Props:
 *   open          — boolean, controls dialog visibility
 *   onOpenChange  — (bool) => void
 *   title         — dialog heading string
 *   onAdd(item)   — called on confirm. When selectOnly=false, item is:
 *                   { inventory_id, product_id, qty, unit_price, product_name, supplier_name }
 *                   When selectOnly=true, item is the raw inventory row.
 *   selectOnly    — if true, no qty input is shown; caller handles qty in its own form
 */
export default function ProductPickerModal({
  open,
  onOpenChange,
  title = 'Add Item',
  onAdd,
  selectOnly = false,
}) {
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [qty,        setQty]        = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  function handleOpen(isOpen) {
    if (isOpen) { setSearch(''); setCategory(''); setSelectedId(''); setQty(1) }
    onOpenChange(isOpen)
  }

  const { data: result = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey:        ['inventory-picker', { search: debouncedSearch, category }],
    queryFn:         () => api.get('/inventory', { params: { search: debouncedSearch, category, limit: 30 } }),
    enabled:         open,
    placeholderData: keepPreviousData,
  })

  const items = result.items ?? []
  const total = result.total ?? 0

  const selected     = items.find((i) => i.id === selectedId) ?? null
  const currentStock = selected?.qty_in_stock ?? null
  const outOfStock   = currentStock !== null && currentStock === 0
  const overQty      = !selectOnly && currentStock !== null && Number(qty) > currentStock && !outOfStock
  const subtotal     = !selectOnly && selected && Number(qty) > 0
    ? Number(qty) * (selected.selling_price ?? 0)
    : null

  function handleAdd() {
    if (!selected) return
    if (selectOnly) {
      onAdd(selected)
    } else {
      onAdd({
        inventory_id:  selected.id,
        product_id:    selected.product_id,
        qty:           Number(qty),
        unit_price:    selected.selling_price,
        product_name:  selected.products?.name ?? '',
        supplier_name: selected.suppliers?.name ?? '',
      })
    }
    handleOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by product, SKU, or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              category === ''
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setCategory(cat === category ? '' : cat); setSelectedId('') }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
          {isLoading && items.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No items match your search.</p>
          ) : (
            items.map((item) => {
              const isSelected = item.id === selectedId
              const disabled   = item.qty_in_stock === 0
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => { setSelectedId(item.id); setQty(1) }}
                  className={[
                    'w-full text-left rounded-md border px-3 py-2.5 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : disabled
                      ? 'opacity-40 cursor-not-allowed border-border'
                      : 'border-border hover:bg-muted/50 cursor-pointer',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.products?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.products?.sku      && <span className="mr-2">SKU: {item.products.sku}</span>}
                        {item.products?.category && <span className="mr-2">{item.products.category}</span>}
                        {item.suppliers?.name    && <span>{item.suppliers.name}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(item.selling_price)}</p>
                        <p className="text-xs text-muted-foreground">per {item.products?.unit ?? 'unit'}</p>
                      </div>
                      <StockBadge qty={item.qty_in_stock} reorderLevel={item.reorder_level} />
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </div>

                  {/* Extra details when selected */}
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {item.batch_number && <span>Batch: {item.batch_number}</span>}
                      {item.expiry_date  && <span>Expires: {formatDate(item.expiry_date)}</span>}
                      {(item.rack_no || item.bin_no) && (
                        <span>
                          Location: {[
                            item.rack_no && `Rack ${item.rack_no}`,
                            item.bin_no  && `Bin ${item.bin_no}`,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {item.is_genuine === false && <span className="text-amber-600">⚠ Non-genuine part</span>}
                    </div>
                  )}
                </button>
              )
            })
          )}

          {/* Result count hint */}
          {total > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-1 pb-0.5">
              {items.length >= total
                ? `${total} result${total !== 1 ? 's' : ''}`
                : `Showing ${items.length} of ${total} — refine your search to narrow down`}
            </p>
          )}
        </div>

        {/* Qty input — only when not selectOnly and an item is selected */}
        {!selectOnly && selected && (
          <div className="border-t pt-3 shrink-0">
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Quantity</Label>
              <Input
                type="number"
                min={1}
                max={currentStock ?? undefined}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-24"
              />
              {overQty && (
                <p className="text-xs text-destructive">Exceeds available stock ({currentStock})</p>
              )}
              {subtotal !== null && !overQty && (
                <p className="ml-auto text-sm font-semibold">Subtotal: {formatCurrency(subtotal)}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={
              !selected ||
              (!selectOnly && (outOfStock || overQty || Number(qty) < 1))
            }
          >
            {selectOnly ? 'Select' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
