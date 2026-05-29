import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

function NewReturnModal({ open, onOpenChange, sales, onSave, saving }) {
  const [saleId, setSaleId] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [returnItems, setReturnItems] = useState([])

  const { data: saleDetail } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => api.get(`/sales/${saleId}`),
    enabled: !!saleId,
  })

  const saleItems = saleDetail?.sale_items ?? saleDetail?.items ?? []

  function handleSaleChange(id) {
    setSaleId(id)
    setReturnItems([])
  }

  function toggleItem(it) {
    setReturnItems((prev) => {
      const exists = prev.find((r) => r.sale_item_id === it.id)
      if (exists) return prev.filter((r) => r.sale_item_id !== it.id)
      return [...prev, { sale_item_id: it.id, product_id: it.product_id, qty_returned: 1, max: it.qty_sold }]
    })
  }

  function setQty(saleItemId, val) {
    setReturnItems((prev) => prev.map((r) => r.sale_item_id === saleItemId ? { ...r, qty_returned: Number(val) } : r))
  }

  function handleOpen(isOpen) {
    if (isOpen) { setSaleId(''); setReason(''); setNotes(''); setReturnItems([]) }
    onOpenChange(isOpen)
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ sale_id: saleId, reason, notes, items: returnItems.map(({ sale_item_id, product_id, qty_returned }) => ({ sale_item_id, product_id, qty_returned })) })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Return</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Original Sale *</Label>
            <Select value={saleId} onValueChange={handleSaleChange} required>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select sale…" /></SelectTrigger>
              <SelectContent>
                {sales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sale_number ?? s.id.slice(0, 8)} — {formatDate(s.created_at)} — {formatCurrency(s.total_amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {saleItems.length > 0 && (
            <div>
              <Label>Select Items to Return</Label>
              <div className="mt-2 space-y-2 border rounded-md p-3">
                {saleItems.map((it) => {
                  const selected = returnItems.find((r) => r.sale_item_id === it.id)
                  return (
                    <div key={it.id} className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={!!selected} onChange={() => toggleItem(it)} className="h-4 w-4" />
                      <span className="flex-1">{it.products?.name ?? it.product_id}</span>
                      <span className="text-muted-foreground text-xs">orig. {it.qty_sold}</span>
                      {selected && (
                        <Input
                          type="number" min="1" max={it.qty_sold}
                          value={selected.qty_returned}
                          onChange={(e) => setQty(it.id, e.target.value)}
                          className="h-7 w-16 text-xs"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <Label>Reason *</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} required className="mt-1" placeholder="e.g. Wrong part, Defective" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !saleId || returnItems.length === 0 || !reason}>
              {saving ? 'Processing…' : 'Process Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ReturnDetailModal({ ret, open, onOpenChange }) {
  const { data: detail } = useQuery({
    queryKey: ['return', ret?.id],
    queryFn: () => api.get(`/returns/${ret.id}`),
    enabled: !!ret?.id,
  })
  const r = detail ?? ret
  const items = r?.return_items ?? r?.items ?? []
  if (!ret) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Return {r?.return_number ?? r?.id?.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Sale:</span> <span className="font-medium">{r?.sales?.sale_number ?? r?.sale_id?.slice(0, 8)}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {formatDate(r?.created_at)}</div>
            <div><span className="text-muted-foreground">Total Refund:</span> <span className="font-semibold">{formatCurrency(r?.total_refund)}</span></div>
            <div><span className="text-muted-foreground">Reason:</span> {r?.reason ?? '—'}</div>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty Returned</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Refund</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id ?? i} className="border-t">
                    <td className="px-3 py-2">{it.products?.name ?? it.product_id}</td>
                    <td className="px-3 py-2 text-right">{it.qty_returned}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(it.refund_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Returns() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [newModal,      setNewModal]      = useState(false)
  const [detailReturn,  setDetailReturn]  = useState(null)
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')
  const [reasonFilter,  setReasonFilter]  = useState('all')

  const { data: returns = [], isLoading } = useQuery({ queryKey: ['returns'], queryFn: () => api.get('/returns') })
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => api.get('/sales') })

  const reasonOptions = useMemo(() => {
    return [...new Set(returns.map((r) => r.reason).filter(Boolean))].sort()
  }, [returns])

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const d = (r.return_date ?? r.created_at ?? '').slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo   && d > dateTo)   return false
      if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false
      return true
    })
  }, [returns, dateFrom, dateTo, reasonFilter])

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/returns', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setNewModal(false)
      toast({ title: 'Return processed — stock restored', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const canCreate = ['admin', 'manager', 'cashier'].includes(role)

  const columns = [
    { key: 'return_number', label: 'Return #', render: (r) => <span className="font-medium">{r.return_number ?? r.id?.slice(0, 8)}</span> },
    { key: 'sale', label: 'Original Sale', render: (r) => r.sales?.sale_number ?? r.sale_id?.slice(0, 8) ?? '—' },
    { key: 'total_refund', label: 'Refund', render: (r) => formatCurrency(r.total_refund) },
    { key: 'reason', label: 'Reason', render: (r) => r.reason || '—' },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
    {
      key: 'actions', label: '', headerClass: 'w-12',
      render: (r) => <Button size="icon" variant="ghost" onClick={() => setDetailReturn(r)}><Eye className="h-4 w-4" /></Button>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Returns"
        description="Process customer returns — stock is automatically restored"
        action={canCreate && (
          <Button onClick={() => setNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Return
          </Button>
        )}
      />
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredReturns}
          searchPlaceholder="Search by return number…"
          searchKeys={['return_number', 'reason']}
          emptyMessage="No returns yet."
          filterSlot={
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Reasons</option>
                {reasonOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                title="From date"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                title="To date"
              />
              {(dateFrom || dateTo || reasonFilter !== 'all') && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); setReasonFilter('all') }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          }
        />
      )}
      <NewReturnModal open={newModal} onOpenChange={setNewModal} sales={sales} onSave={(d) => createMutation.mutate(d)} saving={createMutation.isPending} />
      <ReturnDetailModal ret={detailReturn} open={!!detailReturn} onOpenChange={(open) => !open && setDetailReturn(null)} />
    </div>
  )
}
