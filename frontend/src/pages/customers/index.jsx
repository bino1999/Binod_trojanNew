import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ChevronDown, ChevronRight, Car, Search } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const EMPTY_CUSTOMER = { name: '', phone: '', email: '', address: '' }
const EMPTY_VEHICLE = { registration_number: '', make: '', model: '', year: '', notes: '' }

function CustomerModal({ open, onOpenChange, initial, onSave, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_CUSTOMER)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  function handleOpen(isOpen) {
    if (isOpen) setForm(initial ?? EMPTY_CUSTOMER)
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required className="mt-1" />
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

function VehicleModal({ open, onOpenChange, customerId, initial, onSave, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_VEHICLE)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  function handleOpen(isOpen) {
    if (isOpen) setForm(initial ?? EMPTY_VEHICLE)
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, customer_id: customerId }) }} className="space-y-3">
          <div>
            <Label>Registration Number *</Label>
            <Input value={form.registration_number} onChange={(e) => set('registration_number', e.target.value)} required className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Make</Label>
              <Input value={form.make} onChange={(e) => set('make', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => set('model', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" min="1900" max="2100" value={form.year} onChange={(e) => set('year', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="mt-1" />
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

function CustomerVehicles({ customerId }) {
  const qc = useQueryClient()
  const [vehicleModal, setVehicleModal] = useState(null)

  const { data: vehicles = [] } = useQuery({
    queryKey: ['customer-vehicles', customerId],
    queryFn: () => api.get(`/customers/${customerId}/vehicles`),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => data.id
      ? api.put(`/vehicles/${data.id}`, data)
      : api.post('/vehicles', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-vehicles', customerId] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setVehicleModal(null)
      toast({ title: vehicleModal?.id ? 'Vehicle updated' : 'Vehicle added', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  return (
    <div className="mt-3 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5" /> Vehicles
        </h3>
        <Button size="sm" variant="outline" className="h-7" onClick={() => setVehicleModal({})}>
          + Add Vehicle
        </Button>
      </div>
      {vehicles.length === 0 ? (
        <p className="text-xs text-muted-foreground">No vehicles yet.</p>
      ) : (
        <div className="space-y-1.5">
          {vehicles.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-sm">
              <span className="font-medium">{v.registration_number}</span>
              <span className="text-muted-foreground">{[v.make, v.model, v.year].filter(Boolean).join(' · ')}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setVehicleModal(v)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {vehicleModal !== null && (
        <VehicleModal
          open
          onOpenChange={(open) => !open && setVehicleModal(null)}
          customerId={customerId}
          initial={vehicleModal?.id ? vehicleModal : null}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  )
}

export default function Customers() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [modal,       setModal]       = useState(null)
  const [expandedId,  setExpandedId]  = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  })

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  }, [customers, searchQuery])

  const saveMutation = useMutation({
    mutationFn: (data) => modal?.customer?.id
      ? api.put(`/customers/${modal.customer.id}`, data)
      : api.post('/customers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setModal(null)
      toast({ title: modal?.customer?.id ? 'Customer updated' : 'Customer added', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const canEdit = ['admin', 'manager', 'cashier'].includes(role)

  const cols = [
    {
      key: 'expand', label: '', headerClass: 'w-8',
      render: (r) => (
        <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="text-muted-foreground hover:text-foreground">
          {expandedId === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ),
    },
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    { key: 'created_at', label: 'Added', render: (r) => formatDate(r.created_at) },
    ...(canEdit ? [{
      key: 'actions', label: '', headerClass: 'w-12',
      render: (r) => (
        <Button size="icon" variant="ghost" onClick={() => setModal({ customer: r })}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    }] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer records and their vehicles"
        action={canEdit && (
          <Button onClick={() => setModal({ customer: null })}>
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          {filteredCustomers.length > 0 && searchQuery && (
            <p className="text-xs text-muted-foreground">
              {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
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
              {filteredCustomers.length === 0 ? (
                <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">No customers found.</td></tr>
              ) : (
                filteredCustomers.flatMap((row) => {
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
                          <CustomerVehicles customerId={row.id} />
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
        <CustomerModal
          open
          onOpenChange={(open) => !open && setModal(null)}
          initial={modal.customer?.id ? modal.customer : null}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  )
}
