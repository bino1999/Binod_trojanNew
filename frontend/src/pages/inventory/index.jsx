import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const PAGE_SIZE   = 50
const CATEGORIES  = ['Oil & Fluids', 'Filters', 'Brakes', 'Tyres', 'Electrical', 'Body Parts', 'Consumables', 'Other']

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-40" />
  return sortDir === 'asc'
    ? <ChevronUp   className="inline h-3 w-3 ml-1 text-primary" />
    : <ChevronDown className="inline h-3 w-3 ml-1 text-primary" />
}

export default function Inventory() {
  const [query,        setQuery]        = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [category,     setCategory]     = useState('all')
  const [sortCol,      setSortCol]      = useState('name')
  const [sortDir,      setSortDir]      = useState('asc')
  const [page,         setPage]         = useState(1)

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn:  () => api.get('/inventory'),
  })

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = inventory

    if (query) {
      const q = query.toLowerCase()
      rows = rows.filter((item) => {
        const name = item.products?.name ?? ''
        const sku  = item.products?.sku  ?? ''
        return name.toLowerCase().includes(q) || sku.toLowerCase().includes(q)
      })
    }

    if (category !== 'all') {
      rows = rows.filter((item) => item.products?.category === category)
    }

    if (lowStockOnly) {
      rows = rows.filter((item) => item.qty_in_stock <= item.reorder_level)
    }

    rows = [...rows].sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'name':     va = a.products?.name ?? '';   vb = b.products?.name ?? '';   break
        case 'sku':      va = a.products?.sku  ?? '';   vb = b.products?.sku  ?? '';   break
        case 'category': va = a.products?.category ?? ''; vb = b.products?.category ?? ''; break
        case 'stock':    va = a.qty_in_stock;            vb = b.qty_in_stock;           break
        case 'price':    va = a.selling_price;           vb = b.selling_price;          break
        default:         va = a.products?.name ?? '';   vb = b.products?.name ?? ''
      }
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [inventory, query, category, lowStockOnly, sortCol, sortDir])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows    = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const lowCount = inventory.filter((i) => i.qty_in_stock <= i.reorder_level).length

  function handleSearch(val) { setQuery(val); setPage(1) }
  function handleCategory(val) { setCategory(val); setPage(1) }
  function handleLowStock() { setLowStockOnly((v) => !v); setPage(1) }

  const thClass = 'px-4 py-3 text-left font-medium text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors'

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Live stock ledger — current quantities and pricing"
      />

      {lowCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{lowCount}</strong> product{lowCount !== 1 ? 's are' : ' is'} at or below reorder level.</span>
          <button className="ml-auto underline text-xs" onClick={() => { setLowStockOnly(true); setPage(1) }}>Show only</button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={category} onValueChange={handleCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          size="sm"
          onClick={handleLowStock}
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className={thClass} onClick={() => toggleSort('name')}>
                    Product <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('sku')}>
                    SKU <SortIcon col="sku" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('category')}>
                    Category <SortIcon col="category" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Bought</th>
                  <th className={cn(thClass, 'text-right')} onClick={() => toggleSort('stock')}>
                    In Stock <SortIcon col="stock" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sold</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reorder</th>
                  <th className={cn(thClass, 'text-right')} onClick={() => toggleSort('price')}>
                    Selling Price <SortIcon col="price" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Updated</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No inventory records found.</td>
                  </tr>
                ) : (
                  pageRows.map((item) => {
                    const isLow = item.qty_in_stock <= item.reorder_level
                    return (
                      <tr key={item.id} className={cn('border-t transition-colors', isLow ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-muted/30')}>
                        <td className="px-4 py-3 font-medium">{item.products?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.products?.sku ?? '—'}</td>
                        <td className="px-4 py-3">{item.products?.category ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.qty_bought ?? 0}</td>
                        <td className={cn('px-4 py-3 text-right font-semibold', isLow && 'text-yellow-700')}>
                          {item.qty_in_stock}
                          {isLow && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-yellow-600" />}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.qty_sold ?? 0}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.reorder_level ?? '—'}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.selling_price)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(item.updated_at)}</td>
                        <td className="px-4 py-3">
                          {isLow
                            ? <Badge variant="warning">Low Stock</Badge>
                            : <Badge variant="success">OK</Badge>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination + record count */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {filtered.length === 0
                ? 'No records'
                : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-1">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
