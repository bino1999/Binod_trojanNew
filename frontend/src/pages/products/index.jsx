import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const CATEGORIES = ['Oil & Fluids', 'Filters', 'Brakes', 'Tyres', 'Electrical', 'Body Parts', 'Consumables', 'Other']
const UNITS = ['pcs', 'litres', 'kg', 'set', 'pair', 'box']

const EMPTY_FORM = {
  name: '', sku: '', category: '', unit: 'pcs',
  cost_price: '', selling_price: '', reorder_level: '', description: '',
}

function ProductModal({ open, onOpenChange, initial, onSave, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  function handleOpen(isOpen) {
    if (isOpen) setForm(initial ?? EMPTY_FORM)
    onOpenChange(isOpen)
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...form,
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      reorder_level: Number(form.reorder_level),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Unit *</Label>
              <Select value={form.unit} onValueChange={(v) => set('unit', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input type="number" min="0" value={form.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Cost Price *</Label>
              <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label>Selling Price *</Label>
              <Input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} required className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Products() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | { mode: 'add' | 'edit', product?: {} }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => modal?.product?.id
      ? api.put(`/products/${modal.product.id}`, data)
      : api.post('/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setModal(null)
      toast({ title: modal?.product?.id ? 'Product updated' : 'Product added', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleteTarget(null)
      toast({ title: 'Product deactivated', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const canEdit = ['admin', 'manager', 'warehouse'].includes(role)

  const filtered = categoryFilter === 'all' ? products : products.filter((p) => p.category === categoryFilter)

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'sku', label: 'SKU', render: (r) => r.sku || '—' },
    { key: 'category', label: 'Category', render: (r) => r.category || '—' },
    { key: 'unit', label: 'Unit' },
    { key: 'selling_price', label: 'Selling Price', render: (r) => formatCurrency(r.selling_price) },
    { key: 'reorder_level', label: 'Reorder' },
    {
      key: 'is_active', label: 'Status',
      render: (r) => <Badge variant={r.is_active !== false ? 'success' : 'muted'}>{r.is_active !== false ? 'Active' : 'Inactive'}</Badge>,
    },
    ...(canEdit ? [{
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => setModal({ product: r })}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      headerClass: 'w-20',
    }] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Product Master"
        description="Central reference list of all products and items"
        action={canEdit && (
          <Button onClick={() => setModal({ product: null })}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Search by name or SKU…"
          searchKeys={['name', 'sku']}
          filterSlot={
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          }
          emptyMessage="No products found."
        />
      )}

      {modal !== null && (
        <ProductModal
          open
          onOpenChange={(open) => !open && setModal(null)}
          initial={modal.product}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Deactivate product?"
        description={`"${deleteTarget?.name}" will be marked inactive and hidden from new transactions.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Deactivate"
      />
    </div>
  )
}
