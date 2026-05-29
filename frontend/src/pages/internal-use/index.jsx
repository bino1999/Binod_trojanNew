import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertTriangle, Package } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import ProductPickerModal from '@/components/shared/ProductPickerModal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function NewRecordModal({ open, onOpenChange, onSave, saving, onOpenPicker, selectedInventory }) {
  const [qty,     setQty]     = useState(1)
  const [purpose, setPurpose] = useState('')
  const [notes,   setNotes]   = useState('')

  function handleOpen(isOpen) {
    if (isOpen) { setQty(1); setPurpose(''); setNotes('') }
    onOpenChange(isOpen)
  }

  const currentStock = selectedInventory?.qty_in_stock ?? null
  const overStock    = currentStock !== null && Number(qty) > currentStock

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedInventory) return
    onSave({ product_id: selectedInventory.product_id, qty_used: Number(qty), purpose, notes })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Log Internal Use</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Product selector */}
          <div>
            <Label>Product *</Label>
            {selectedInventory ? (
              <div className="mt-1 flex items-center gap-2 rounded-md border px-3 py-2.5 bg-muted/30">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{selectedInventory.products?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedInventory.products?.sku && <span className="mr-2">SKU: {selectedInventory.products.sku}</span>}
                    {selectedInventory.suppliers?.name && <span>{selectedInventory.suppliers.name}</span>}
                  </p>
                </div>
                <button type="button" onClick={onOpenPicker} className="text-xs text-primary underline shrink-0 hover:opacity-80">
                  Change
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="mt-1 w-full justify-start gap-2 text-muted-foreground" onClick={onOpenPicker}>
                <Package className="h-4 w-4" /> Select product from inventory…
              </Button>
            )}
            {currentStock !== null && (
              <p className="text-xs text-muted-foreground mt-1">Current stock: <strong>{currentStock}</strong></p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <Label>Quantity Used *</Label>
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              className="mt-1"
            />
            {overStock && (
              <p className="text-xs text-yellow-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> Qty exceeds current stock ({currentStock})
              </p>
            )}
          </div>

          {/* Purpose */}
          <div>
            <Label>Purpose *</Label>
            <Input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              className="mt-1"
              placeholder="e.g. Workshop maintenance"
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !selectedInventory || !purpose}>
              {saving ? 'Saving…' : 'Log Use'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function InternalUse() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [modal,             setModal]             = useState(false)
  const [pickerOpen,        setPickerOpen]        = useState(false)
  const [selectedInventory, setSelectedInventory] = useState(null)
  const [dateFrom,          setDateFrom]          = useState('')
  const [dateTo,            setDateTo]            = useState('')

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['internal-use'],
    queryFn: () => api.get('/internal-use'),
  })

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const d = (r.date_used ?? r.created_at ?? '').slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo   && d > dateTo)   return false
      return true
    })
  }, [records, dateFrom, dateTo])

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/internal-use', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['internal-use'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setModal(false)
      setSelectedInventory(null)
      toast({ title: 'Internal use logged', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  function handleModalOpen(isOpen) {
    if (!isOpen) setSelectedInventory(null)
    setModal(isOpen)
  }

  const canCreate = ['admin', 'manager', 'warehouse', 'technician'].includes(role)

  const columns = [
    { key: 'product', label: 'Product', render: (r) => <span className="font-medium">{r.products?.name ?? r.product_id}</span> },
    { key: 'qty_used', label: 'Qty Used' },
    { key: 'purpose', label: 'Purpose', render: (r) => r.purpose || '—' },
    { key: 'user', label: 'Used By', render: (r) => r.user_profiles?.email ?? r.used_by ?? '—' },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
    { key: 'notes', label: 'Notes', render: (r) => r.notes || '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Internal Use"
        description="Log items consumed within the workshop (non-billable)"
        action={canCreate && (
          <Button onClick={() => handleModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Log Use
          </Button>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRecords}
          searchPlaceholder="Search by product or purpose…"
          searchKeys={['purpose']}
          emptyMessage="No internal use records yet."
          filterSlot={
            <div className="flex flex-wrap gap-2 items-center">
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
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          }
        />
      )}

      <NewRecordModal
        open={modal}
        onOpenChange={handleModalOpen}
        onSave={(data) => createMutation.mutate(data)}
        saving={createMutation.isPending}
        onOpenPicker={() => setPickerOpen(true)}
        selectedInventory={selectedInventory}
      />

      <ProductPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Select Product"
        selectOnly
        onAdd={(item) => {
          setSelectedInventory(item)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
