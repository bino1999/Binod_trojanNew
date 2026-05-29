import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const REASONS = ['damaged', 'expired', 'lost', 'correction', 'other']

function NewAdjustmentModal({ open, onOpenChange, products, onSave, saving }) {
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  function handleOpen(isOpen) {
    if (isOpen) { setProductId(''); setQty(''); setReason(''); setNotes('') }
    onOpenChange(isOpen)
  }

  const isNegative = Number(qty) < 0

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ product_id: productId, qty_adjusted: Number(qty), reason, notes })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Stock Adjustment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId} required>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select product…" /></SelectTrigger>
              <SelectContent>
                {products.filter((p) => p.is_active !== false).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity Adjusted *</Label>
            <Input
              type="number" value={qty}
              onChange={(e) => setQty(e.target.value)} required className="mt-1"
              placeholder="Positive = add stock · Negative = write-off"
            />
            {qty !== '' && (
              <p className={`text-xs mt-1 ${isNegative ? 'text-destructive' : 'text-green-700'}`}>
                {isNegative ? `Write-off ${Math.abs(Number(qty))} units` : `Add ${Number(qty)} units`}
              </p>
            )}
          </div>
          <div>
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes {reason === 'other' && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={reason === 'other'}
              rows={2} className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !productId || qty === '' || !reason}>
              {saving ? 'Saving…' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Adjustments() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [modal,        setModal]        = useState(false)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [reasonFilter, setReasonFilter] = useState('all')

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => api.get('/adjustments'),
  })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products') })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/adjustments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setModal(false)
      toast({ title: 'Adjustment saved', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const canCreate = ['admin', 'manager', 'warehouse'].includes(role)

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      const d = (a.date_adjusted ?? a.created_at ?? '').slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo   && d > dateTo)   return false
      if (reasonFilter !== 'all' && a.reason !== reasonFilter) return false
      return true
    })
  }, [adjustments, dateFrom, dateTo, reasonFilter])

  const columns = [
    { key: 'product', label: 'Product', render: (r) => <span className="font-medium">{r.products?.name ?? r.product_id}</span> },
    {
      key: 'qty_adjusted', label: 'Qty Adjusted',
      render: (r) => (
        <span className={r.qty_adjusted < 0 ? 'text-destructive font-medium' : 'text-green-700 font-medium'}>
          {r.qty_adjusted > 0 ? '+' : ''}{r.qty_adjusted}
        </span>
      ),
    },
    {
      key: 'reason', label: 'Reason',
      render: (r) => <Badge variant={r.qty_adjusted < 0 ? 'destructive' : 'success'}>{r.reason}</Badge>,
    },
    { key: 'adjusted_by', label: 'By', render: (r) => r.user_profiles?.email ?? r.adjusted_by ?? '—' },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
    { key: 'notes', label: 'Notes', render: (r) => r.notes || '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        description="Write off damaged, expired, or lost stock — or correct counts"
        action={canCreate && (
          <Button onClick={() => setModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Adjustment
          </Button>
        )}
      />
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredAdjustments}
          searchPlaceholder="Search by reason or notes…"
          searchKeys={['reason', 'notes']}
          emptyMessage="No adjustments yet."
          filterSlot={
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Reasons</option>
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
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
      <NewAdjustmentModal
        open={modal}
        onOpenChange={setModal}
        products={products}
        onSave={(d) => createMutation.mutate(d)}
        saving={createMutation.isPending}
      />
    </div>
  )
}
