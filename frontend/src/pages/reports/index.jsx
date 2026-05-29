import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

function DateRangeFilter({ from, to, onChange }) {
  return (
    <div className="flex items-end gap-3 mb-4">
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={(e) => onChange('from', e.target.value)} className="mt-1 h-8 text-xs w-36" />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={(e) => onChange('to', e.target.value)} className="mt-1 h-8 text-xs w-36" />
      </div>
    </div>
  )
}

function SimpleTable({ columns, data, emptyMessage = 'No data.' }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2 text-left font-medium text-muted-foreground ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-muted-foreground text-sm">{emptyMessage}</td></tr>
          ) : data.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/20">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-stock'],
    queryFn: () => api.get('/reports/stock'),
  })
  const cols = [
    { key: 'name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'qty_in_stock', label: 'In Stock', align: 'right' },
    { key: 'reorder_level', label: 'Reorder', align: 'right' },
    { key: 'selling_price', label: 'Selling Price', align: 'right', render: (r) => formatCurrency(r.selling_price) },
    {
      key: 'status', label: 'Status',
      render: (r) => r.qty_in_stock <= r.reorder_level
        ? <Badge variant="warning">Low Stock</Badge>
        : <Badge variant="success">OK</Badge>,
    },
  ]
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  return <SimpleTable columns={cols} data={data} emptyMessage="No stock data." />
}

function StockMovementReport() {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products') })
  const [productId, setProductId] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const { data = [], isLoading } = useQuery({
    queryKey: ['report-stock-movement', productId, dateRange],
    queryFn: () => {
      const params = new URLSearchParams({ product_id: productId })
      if (dateRange.from) params.append('from', dateRange.from)
      if (dateRange.to) params.append('to', dateRange.to)
      return api.get(`/reports/stock-movement?${params}`)
    },
    enabled: !!productId,
  })

  const cols = [
    { key: 'type', label: 'Type', render: (r) => <Badge variant="secondary">{r.type}</Badge> },
    { key: 'qty', label: 'Qty', align: 'right', render: (r) => <span className={r.qty < 0 ? 'text-destructive' : 'text-green-700'}>{r.qty > 0 ? '+' : ''}{r.qty}</span> },
    { key: 'reference', label: 'Reference' },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date ?? r.created_at) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1 max-w-xs">
          <Label className="text-xs">Product *</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select product…" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(k, v) => setDateRange((p) => ({ ...p, [k]: v }))} />
      </div>
      {!productId ? (
        <p className="text-sm text-muted-foreground">Select a product to view its stock movement.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <SimpleTable columns={cols} data={data} emptyMessage="No movement data for this product." />
      )}
    </div>
  )
}

function useRangeQuery(key, endpoint) {
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const { data = [], isLoading } = useQuery({
    queryKey: [key, dateRange],
    queryFn: () => {
      const params = new URLSearchParams()
      if (dateRange.from) params.append('from', dateRange.from)
      if (dateRange.to) params.append('to', dateRange.to)
      const q = params.toString()
      return api.get(`${endpoint}${q ? `?${q}` : ''}`)
    },
  })
  return { data, isLoading, dateRange, setDateRange }
}

function SupplierPurchasesReport() {
  const { data, isLoading, dateRange, setDateRange } = useRangeQuery('report-supplier-purchases', '/reports/supplier-purchases')
  const cols = [
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'order_count', label: 'Orders', align: 'right' },
    { key: 'total_spent', label: 'Total Spent', align: 'right', render: (r) => formatCurrency(r.total_spent) },
  ]
  const chartData = data.map((r) => ({ name: r.supplier_name, total: Number(r.total_spent ?? 0) }))
  return (
    <div className="space-y-4">
      <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(k, v) => setDateRange((p) => ({ ...p, [k]: v }))} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => formatCurrency(v)} /><Bar dataKey="total" fill="hsl(var(--primary))" radius={[3,3,0,0]} /></BarChart>
            </ResponsiveContainer>
          )}
          <SimpleTable columns={cols} data={data} emptyMessage="No supplier purchase data." />
        </>
      )}
    </div>
  )
}

function SalesReport() {
  const { data, isLoading, dateRange, setDateRange } = useRangeQuery('report-sales', '/reports/sales')
  const cols = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date ?? r.created_at) },
    { key: 'sale_count', label: 'Sales', align: 'right' },
    { key: 'total_revenue', label: 'Revenue', align: 'right', render: (r) => formatCurrency(r.total_revenue) },
  ]
  const chartData = data.map((r) => ({ name: r.date ?? r.sale_number, revenue: Number(r.total_revenue ?? r.total_amount ?? 0) }))
  return (
    <div className="space-y-4">
      <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(k, v) => setDateRange((p) => ({ ...p, [k]: v }))} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => formatCurrency(v)} /><Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" dot={false} /></LineChart>
            </ResponsiveContainer>
          )}
          <SimpleTable columns={cols} data={data} emptyMessage="No sales data for this period." />
        </>
      )}
    </div>
  )
}

function ServiceJobsReport() {
  const { data, isLoading, dateRange, setDateRange } = useRangeQuery('report-service-jobs', '/reports/service-jobs')
  const cols = [
    { key: 'job_number', label: 'Job #' },
    { key: 'customer', label: 'Customer' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant="secondary">{r.status}</Badge> },
    { key: 'parts_total', label: 'Parts', align: 'right', render: (r) => formatCurrency(r.parts_total) },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
  ]
  return (
    <div className="space-y-4">
      <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(k, v) => setDateRange((p) => ({ ...p, [k]: v }))} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : <SimpleTable columns={cols} data={data} emptyMessage="No service job data." />}
    </div>
  )
}

function InternalUseReport() {
  const { data, isLoading, dateRange, setDateRange } = useRangeQuery('report-internal-use', '/reports/internal-use')
  const cols = [
    { key: 'product_name', label: 'Product' },
    { key: 'total_qty', label: 'Total Used', align: 'right' },
    { key: 'total_cost', label: 'Total Cost', align: 'right', render: (r) => formatCurrency(r.total_cost) },
  ]
  return (
    <div className="space-y-4">
      <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(k, v) => setDateRange((p) => ({ ...p, [k]: v }))} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : <SimpleTable columns={cols} data={data} emptyMessage="No internal use data." />}
    </div>
  )
}

function ReturnsReport() {
  const { data, isLoading, dateRange, setDateRange } = useRangeQuery('report-returns', '/reports/returns')
  const cols = [
    { key: 'return_number', label: 'Return #' },
    { key: 'reason', label: 'Reason' },
    { key: 'total_refund', label: 'Refund', align: 'right', render: (r) => formatCurrency(r.total_refund) },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
  ]
  return (
    <div className="space-y-4">
      <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(k, v) => setDateRange((p) => ({ ...p, [k]: v }))} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : <SimpleTable columns={cols} data={data} emptyMessage="No returns data." />}
    </div>
  )
}

function ProfitMarginReport() {
  const { data: marginData = [], isLoading: loadingMargin } = useQuery({
    queryKey: ['report-profit-margin'],
    queryFn: () => api.get('/reports/profit-margin'),
  })
  const { data: lowStock = [], isLoading: loadingLow } = useQuery({
    queryKey: ['report-low-stock'],
    queryFn: () => api.get('/reports/low-stock'),
  })

  const marginCols = [
    { key: 'name', label: 'Product' },
    { key: 'cost_price', label: 'Cost', align: 'right', render: (r) => formatCurrency(r.cost_price) },
    { key: 'selling_price', label: 'Selling', align: 'right', render: (r) => formatCurrency(r.selling_price) },
    {
      key: 'margin', label: 'Margin %', align: 'right',
      render: (r) => {
        const pct = r.cost_price > 0 ? (((r.selling_price - r.cost_price) / r.selling_price) * 100).toFixed(1) : '—'
        return <span className={Number(pct) < 20 ? 'text-destructive' : 'text-green-700'}>{pct}%</span>
      },
    },
  ]
  const lowCols = [
    { key: 'name', label: 'Product' },
    { key: 'qty_in_stock', label: 'In Stock', align: 'right' },
    { key: 'reorder_level', label: 'Reorder', align: 'right' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Profit Margin by Product</h3>
        {loadingMargin ? <p className="text-sm text-muted-foreground">Loading…</p> : <SimpleTable columns={marginCols} data={marginData} emptyMessage="No margin data." />}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Low Stock Alerts</h3>
        {loadingLow ? <p className="text-sm text-muted-foreground">Loading…</p> : <SimpleTable columns={lowCols} data={lowStock} emptyMessage="No items below reorder level." />}
      </div>
    </div>
  )
}

export default function Reports() {
  return (
    <div>
      <PageHeader title="Reports" description="Analytics and reporting" />
      <Tabs defaultValue="stock">
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="movement">Movement</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="service-jobs">Service Jobs</TabsTrigger>
          <TabsTrigger value="internal-use">Internal Use</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="profit">Profit & Low Stock</TabsTrigger>
        </TabsList>
        <TabsContent value="stock"><StockReport /></TabsContent>
        <TabsContent value="movement"><StockMovementReport /></TabsContent>
        <TabsContent value="purchases"><SupplierPurchasesReport /></TabsContent>
        <TabsContent value="sales"><SalesReport /></TabsContent>
        <TabsContent value="service-jobs"><ServiceJobsReport /></TabsContent>
        <TabsContent value="internal-use"><InternalUseReport /></TabsContent>
        <TabsContent value="returns"><ReturnsReport /></TabsContent>
        <TabsContent value="profit"><ProfitMarginReport /></TabsContent>
      </Tabs>
    </div>
  )
}
