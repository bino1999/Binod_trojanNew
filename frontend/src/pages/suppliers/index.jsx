import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Link, Unlink, Search } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const EMPTY_FORM = { name: '', contact_person: '', phone: '', email: '', address: '' }

function SupplierModal({ open, onOpenChange, initial, onSave, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  function handleOpen(isOpen) {
    if (isOpen) setForm(initial ?? EMPTY_FORM)
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} className="mt-1" />
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

function LinkedProducts({ supplierId }) {
  const qc = useQueryClient()
  const [addingProductId, setAddingProductId] = useState('')

  const { data: linked = [] } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: () => api.get(`/suppliers/${supplierId}/products`),
  })
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  })

  const linkMutation = useMutation({
    mutationFn: (productId) => api.post(`/suppliers/${supplierId}/products`, { product_id: productId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-products', supplierId] })
      setAddingProductId('')
      toast({ title: 'Product linked', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const unlinkMutation = useMutation({
    mutationFn: (productId) => api.delete(`/suppliers/${supplierId}/products/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-products', supplierId] })
      toast({ title: 'Product unlinked', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const linkedIds = new Set(linked.map((p) => p.product_id ?? p.id))
  const available = allProducts.filter((p) => !linkedIds.has(p.id) && p.is_active !== false)

  return (
    <div className="mt-4 border rounded-lg p-4 bg-muted/20">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
        <Link className="h-3.5 w-3.5" /> Linked Products
      </h3>
      {linked.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">No products linked yet.</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {linked.map((lp) => (
            <div key={lp.product_id ?? lp.id} className="flex items-center justify-between text-sm">
              <span>{lp.products?.name ?? lp.name ?? lp.product_id}</span>
              <Button
                size="sm" variant="ghost"
                className="h-7 px-2 text-destructive hover:text-destructive"
                onClick={() => unlinkMutation.mutate(lp.product_id ?? lp.id)}
                disabled={unlinkMutation.isPending}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={addingProductId} onValueChange={setAddingProductId}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select product to link…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm" className="h-8"
            disabled={!addingProductId || linkMutation.isPending}
            onClick={() => linkMutation.mutate(addingProductId)}
          >
            Link
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Suppliers() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [modal,        setModal]        = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [expandedId,   setExpandedId]   = useState(null)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers'),
  })

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return suppliers.filter((s) => {
      if (statusFilter === 'active'   && s.is_active === false) return false
      if (statusFilter === 'inactive' && s.is_active !== false) return false
      if (!q) return true
      return (
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.contact_person ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [suppliers, searchQuery, statusFilter])

  const saveMutation = useMutation({
    mutationFn: (data) => modal?.supplier?.id
      ? api.put(`/suppliers/${modal.supplier.id}`, data)
      : api.post('/suppliers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setModal(null)
      toast({ title: modal?.supplier?.id ? 'Supplier updated' : 'Supplier added', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setDeleteTarget(null)
      toast({ title: 'Supplier deactivated', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const canEdit = ['admin', 'manager', 'warehouse'].includes(role)

  const cols = [
    {
      key: 'expand', label: '', headerClass: 'w-8',
      render: (r) => (
        <button
          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expandedId === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ),
    },
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'contact_person', label: 'Contact', render: (r) => r.contact_person || '—' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    {
      key: 'is_active', label: 'Status',
      render: (r) => <Badge variant={r.is_active !== false ? 'success' : 'muted'}>{r.is_active !== false ? 'Active' : 'Inactive'}</Badge>,
    },
    ...(canEdit ? [{
      key: 'actions', label: '', headerClass: 'w-20',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => setModal({ supplier: r })}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage supplier contacts and their product links"
        action={canEdit && (
          <Button onClick={() => setModal({ supplier: null })}>
            <Plus className="h-4 w-4 mr-2" /> Add Supplier
          </Button>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, contact, phone or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          {filteredSuppliers.length > 0 && (searchQuery || statusFilter !== 'all') && (
            <p className="text-xs text-muted-foreground">
              {filteredSuppliers.length} of {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
            </p>
          )}
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {cols.map((col) => (
                  <th key={col.key} className={`px-4 py-3 text-left font-medium text-muted-foreground ${col.headerClass ?? ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">No suppliers found.</td>
                </tr>
              ) : (
                filteredSuppliers.flatMap((row) => {
                  const rows = [
                    <tr key={row.id} className="border-t hover:bg-muted/30 transition-colors">
                      {cols.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>,
                  ]
                  if (expandedId === row.id) {
                    rows.push(
                      <tr key={`${row.id}-exp`} className="bg-muted/10 border-t">
                        <td colSpan={cols.length} className="px-6 pb-4">
                          <LinkedProducts supplierId={row.id} />
                        </td>
                      </tr>
                    )
                  }
                  return rows
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {modal !== null && (
        <SupplierModal
          open
          onOpenChange={(open) => !open && setModal(null)}
          initial={modal.supplier?.id ? modal.supplier : null}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Deactivate supplier?"
        description={`"${deleteTarget?.name}" will be marked inactive.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Deactivate"
      />
    </div>
  )
}
