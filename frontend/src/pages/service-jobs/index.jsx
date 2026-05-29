import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, CheckCircle, Trash2, Play, Clock, Receipt, DollarSign, Banknote, CreditCard, Edit2, Printer } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ProductPickerModal from '@/components/shared/ProductPickerModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

function statusBadge(status) {
  const map = {
    estimate:          'secondary',
    open:              'info',
    in_progress:       'warning',
    waiting_for_parts: 'destructive',
    completed:         'success',
    invoiced:          'default',
    paid:              'success',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status?.replace(/_/g, ' ')}</Badge>
}

const PAYMENT_METHOD_LABELS = {
  cash:          'Cash',
  card:          'Card',
  bank_transfer: 'Bank Transfer',
  cheque:        'Cheque',
}

function ModeToggle({ value, onChange, options }) {
  return (
    <div className="flex rounded-md border overflow-hidden text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 transition-colors ${
            value === o.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background hover:bg-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── New Job Modal ────────────────────────────────────────────────────────────
function NewJobModal({ open, onOpenChange, customers, vehicles, users, onSave, saving }) {
  const qc = useQueryClient()

  const [customerMode,    setCustomerMode]    = useState('existing')
  const [customerId,      setCustomerId]      = useState('')
  const [newCustName,     setNewCustName]     = useState('')
  const [newCustPhone,    setNewCustPhone]    = useState('')
  const [newCustEmail,    setNewCustEmail]    = useState('')
  const [newCustAddress,  setNewCustAddress]  = useState('')

  const [vehicleMode,   setVehicleMode]   = useState('existing')
  const [vehicleId,     setVehicleId]     = useState('')
  const [newVehPlate,   setNewVehPlate]   = useState('')
  const [newVehMake,    setNewVehMake]    = useState('')
  const [newVehModel,   setNewVehModel]   = useState('')
  const [newVehYear,    setNewVehYear]    = useState('')
  const [newVehColor,   setNewVehColor]   = useState('')

  const [technicianId,       setTechnicianId]       = useState('')
  const [serviceType,        setServiceType]        = useState('normal')
  const [mileageIn,          setMileageIn]          = useState('')
  const [customerComplaint,  setCustomerComplaint]  = useState('')
  const [laborDescription,   setLaborDescription]   = useState('')
  const [laborCost,          setLaborCost]          = useState('')
  const [notes,              setNotes]              = useState('')
  const [localSaving,        setLocalSaving]        = useState(false)

  const customerVehicles = vehicles.filter((v) => v.customer_id === customerId)
  const technicians      = users.filter((u) => ['technician', 'admin', 'manager'].includes(u.role))
  const isSaving         = localSaving || saving

  function reset() {
    setCustomerMode('existing'); setCustomerId('')
    setNewCustName(''); setNewCustPhone(''); setNewCustEmail(''); setNewCustAddress('')
    setVehicleMode('existing'); setVehicleId('')
    setNewVehPlate(''); setNewVehMake(''); setNewVehModel(''); setNewVehYear(''); setNewVehColor('')
    setTechnicianId(''); setServiceType('normal'); setMileageIn('')
    setCustomerComplaint(''); setLaborDescription(''); setLaborCost(''); setNotes('')
    setLocalSaving(false)
  }

  function handleOpen(isOpen) {
    if (isOpen) reset()
    onOpenChange(isOpen)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalSaving(true)
    try {
      let cId = customerId || null
      if (customerMode === 'new') {
        const created = await api.post('/customers', {
          name:    newCustName.trim(),
          phone:   newCustPhone   || null,
          email:   newCustEmail   || null,
          address: newCustAddress || null,
        })
        cId = created.id
        qc.invalidateQueries({ queryKey: ['customers'] })
      }

      let vId = vehicleId || null
      if (vehicleMode === 'new') {
        const created = await api.post('/vehicles', {
          customer_id:         cId,
          registration_number: newVehPlate.trim().toUpperCase(),
          make:  newVehMake  || null,
          model: newVehModel || null,
          year:  newVehYear  ? Number(newVehYear) : null,
          color: newVehColor || null,
        })
        vId = created.id
        qc.invalidateQueries({ queryKey: ['vehicles'] })
      }

      onSave({
        customer_id:        cId,
        vehicle_id:         vId,
        technician_id:      technicianId      || null,
        service_type:       serviceType,
        mileage_in:         mileageIn         ? Number(mileageIn) : null,
        customer_complaint: customerComplaint || null,
        labor_description:  laborDescription  || null,
        labor_cost:         laborCost         ? Number(laborCost) : 0,
        notes:              notes             || null,
      })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
      setLocalSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Service Job</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <Label>Service Type</Label>
            <div className="flex gap-2 mt-1">
              {['normal', 'mechanical', 'estimate'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setServiceType(t)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors capitalize ${
                    serviceType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {serviceType === 'estimate' && (
              <p className="text-xs text-muted-foreground mt-1">
                Job will be created in <strong>Estimate</strong> status — no stock is affected until the job is opened.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customer</Label>
              <ModeToggle
                value={customerMode}
                onChange={(v) => { setCustomerMode(v); setCustomerId(''); setVehicleId('') }}
                options={[{ value: 'existing', label: 'Existing' }, { value: 'new', label: 'New Customer' }]}
              />
            </div>

            {customerMode === 'existing' ? (
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setVehicleId('') }}>
                <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-md border bg-muted/30">
                <div className="col-span-2">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    placeholder="e.g. Nimal Silva"
                    value={newCustName} onChange={(e) => setNewCustName(e.target.value)}
                    required className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input placeholder="07X XXX XXXX" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" placeholder="email@example.com" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Input placeholder="Address" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Vehicle</Label>
              <ModeToggle
                value={vehicleMode}
                onChange={(v) => { setVehicleMode(v); setVehicleId('') }}
                options={[{ value: 'existing', label: 'Existing' }, { value: 'new', label: 'New Vehicle' }]}
              />
            </div>

            {vehicleMode === 'existing' ? (
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={customerMode === 'existing' && !customerId}>
                <SelectTrigger>
                  <SelectValue placeholder={customerMode === 'existing' && !customerId ? 'Select a customer first…' : 'Select vehicle…'} />
                </SelectTrigger>
                <SelectContent>
                  {customerVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number ?? v.plate_number} — {[v.make, v.model].filter(Boolean).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-md border bg-muted/30">
                <div className="col-span-2">
                  <Label className="text-xs">Plate / Registration *</Label>
                  <Input placeholder="e.g. ABC-1234" value={newVehPlate} onChange={(e) => setNewVehPlate(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Make</Label>
                  <Input placeholder="Toyota" value={newVehMake} onChange={(e) => setNewVehMake(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Input placeholder="Corolla" value={newVehModel} onChange={(e) => setNewVehModel(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Year</Label>
                  <Input type="number" placeholder="2020" min="1900" max={new Date().getFullYear() + 1} value={newVehYear} onChange={(e) => setNewVehYear(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input placeholder="White" value={newVehColor} onChange={(e) => setNewVehColor(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assigned Technician</Label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select technician…" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mileage In (km)</Label>
              <Input type="number" min="0" placeholder="e.g. 45 000" value={mileageIn} onChange={(e) => setMileageIn(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Customer Complaint / Symptom</Label>
            <Textarea placeholder="What the customer reported…" value={customerComplaint} onChange={(e) => setCustomerComplaint(e.target.value)} rows={2} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Labor Description</Label>
              <Textarea placeholder="Work to be performed" value={laborDescription} onChange={(e) => setLaborDescription(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea placeholder="Internal notes (not shown to customer)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
            </div>
          </div>

          <div className="w-1/2">
            <Label>Estimated Labor Cost</Label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} className="mt-1" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Create Job'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ open, onOpenChange, job, partsTotal, laborTotal, grandTotal, onConfirm, saving }) {
  const [method,    setMethod]    = useState(job?.payment_method ?? '')
  const [reference, setReference] = useState(job?.payment_reference ?? '')
  const [tendered,  setTendered]  = useState(job?.amount_tendered ?? '')

  const handleOpen = (v) => {
    if (v) {
      setMethod(job?.payment_method ?? '')
      setReference(job?.payment_reference ?? '')
      setTendered(job?.amount_tendered ?? '')
    }
    onOpenChange(v)
  }

  const change           = method === 'cash' ? (Number(tendered) || 0) - grandTotal : 0
  const cashInsufficient = method === 'cash' && (Number(tendered) || 0) < grandTotal
  const canConfirm       = !!method && !cashInsufficient

  const handleConfirm = () => {
    onConfirm({
      payment_method:    method,
      payment_reference: reference || null,
      amount_tendered:   method === 'cash' ? Number(tendered) : null,
    })
  }

  const methodButtons = [
    { value: 'cash',          label: 'Cash',          Icon: Banknote   },
    { value: 'card',          label: 'Card',          Icon: CreditCard },
    { value: 'bank_transfer', label: 'Bank Transfer', Icon: DollarSign },
    { value: 'cheque',        label: 'Cheque',        Icon: Receipt    },
  ]

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Payment — {job?.job_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-md border divide-y text-sm">
            <div className="flex justify-between px-3 py-2 text-muted-foreground">
              <span>Parts subtotal</span><span>{formatCurrency(partsTotal)}</span>
            </div>
            <div className="flex justify-between px-3 py-2 text-muted-foreground">
              <span>Labor</span><span>{formatCurrency(laborTotal)}</span>
            </div>
            <div className="flex justify-between px-3 py-2 font-semibold">
              <span>Total Due</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {methodButtons.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm transition-colors ${
                    method === value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {method === 'cash' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tendered">Amount Tendered</Label>
                <Input id="tendered" type="number" min={0} step="0.01" placeholder="0.00" value={tendered} onChange={(e) => setTendered(e.target.value)} />
              </div>
              {Number(tendered) > 0 && (
                <div className={`flex justify-between px-3 py-2 rounded-md font-semibold ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span>{change >= 0 ? 'Change Due' : 'Amount Short'}</span>
                  <span>{formatCurrency(Math.abs(change))}</span>
                </div>
              )}
            </div>
          )}
          {method === 'card' && (
            <div className="space-y-1.5">
              <Label htmlFor="ref">Card Reference / Last 4 Digits <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="ref" placeholder="e.g. 4242" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
          {method === 'bank_transfer' && (
            <div className="space-y-1.5">
              <Label htmlFor="ref">Bank Reference No. <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="ref" placeholder="e.g. TXN-123456" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
          {method === 'cheque' && (
            <div className="space-y-1.5">
              <Label htmlFor="ref">Cheque Number <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="ref" placeholder="e.g. 001234" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || saving}>
            {saving ? 'Processing…' : 'Confirm Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ open, onOpenChange, job, items, partsTotal, laborTotal, grandTotal }) {
  const j = job
  if (!j) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt — {j.invoice_number ?? j.job_number}</DialogTitle>
        </DialogHeader>
        <div id="receipt-printable" className="space-y-3 text-sm font-mono">
          <div className="text-center border-b pb-3">
            <p className="font-bold text-base">VEHICLE SERVICE CENTER</p>
            <p className="text-xs text-muted-foreground">Invoice No: {j.invoice_number ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Date: {formatDate(j.payment_date ?? j.created_at)}</p>
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex gap-2"><span className="text-muted-foreground w-20">Customer:</span><span className="font-medium">{j.customers?.name ?? '—'}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-20">Vehicle:</span><span className="font-medium">{j.vehicles?.registration_number ?? '—'}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-20">Job No:</span><span className="font-medium">{j.job_number}</span></div>
          </div>
          <div className="border-t pt-2">
            <p className="font-semibold mb-1 text-xs uppercase tracking-wide text-muted-foreground">Parts</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-0.5 font-medium">Item</th>
                  <th className="text-right py-0.5 font-medium">Qty</th>
                  <th className="text-right py-0.5 font-medium">Price</th>
                  <th className="text-right py-0.5 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="py-1 text-muted-foreground">—</td></tr>
                ) : items.map((it) => (
                  <tr key={it.id} className="border-b border-dashed">
                    <td className="py-0.5">{it.products?.name ?? '—'}</td>
                    <td className="py-0.5 text-right">{it.qty_used}</td>
                    <td className="py-0.5 text-right">{formatCurrency(it.unit_price)}</td>
                    <td className="py-0.5 text-right">{formatCurrency(it.qty_used * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t divide-y text-xs">
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Parts subtotal</span><span>{formatCurrency(partsTotal)}</span>
            </div>
            {laborTotal > 0 && (
              <div className="flex justify-between py-1 text-muted-foreground">
                <div>
                  <span>Labor</span>
                  {j.labor_description && <p className="italic">{j.labor_description}</p>}
                </div>
                <span>{formatCurrency(laborTotal)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 font-bold">
              <span>TOTAL</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <div className="border-t pt-2 text-xs space-y-0.5">
            <div className="flex gap-2"><span className="text-muted-foreground w-24">Payment:</span><span className="capitalize">{PAYMENT_METHOD_LABELS[j.payment_method] ?? j.payment_method ?? '—'}</span></div>
            {j.payment_method === 'cash' && j.amount_tendered != null && (
              <>
                <div className="flex gap-2"><span className="text-muted-foreground w-24">Tendered:</span><span>{formatCurrency(j.amount_tendered)}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-24">Change:</span><span>{formatCurrency(Math.max(0, Number(j.amount_tendered) - grandTotal))}</span></div>
              </>
            )}
            {j.payment_reference && (
              <div className="flex gap-2"><span className="text-muted-foreground w-24">Reference:</span><span>{j.payment_reference}</span></div>
            )}
          </div>
          <div className="border-t pt-3 text-center text-xs text-muted-foreground">
            <p>Thank you for your business!</p>
            <p>Please retain this receipt for your records.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────
function JobDetailModal({ job, open, onOpenChange }) {
  const qc = useQueryClient()
  const { role } = useAuthStore()
  const [addItemModal, setAddItemModal] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [paymentModal, setPaymentModal] = useState(false)
  const [receiptModal, setReceiptModal] = useState(false)

  const { data: detail } = useQuery({
    queryKey: ['service-job', job?.id],
    queryFn:  () => api.get(`/service-jobs/${job.id}`),
    enabled:  !!job?.id,
  })

  const addItemMutation = useMutation({
    mutationFn: (data) => api.post(`/service-jobs/${job.id}/items`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-job', job.id] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast({ title: 'Item added', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId) => api.delete(`/service-jobs/${job.id}/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-job', job.id] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setRemoveTarget(null)
      toast({ title: 'Item removed — stock restored', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const statusMutation = useMutation({
    mutationFn: (status) => api.put(`/service-jobs/${job.id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-jobs'] })
      qc.invalidateQueries({ queryKey: ['service-job', job.id] })
      toast({ title: 'Status updated', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const paymentMutation = useMutation({
    mutationFn: (data) => api.post(`/service-jobs/${job.id}/payment`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-jobs'] })
      qc.invalidateQueries({ queryKey: ['service-job', job.id] })
      setPaymentModal(false)
      setReceiptModal(true)
      toast({ title: 'Payment recorded', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Payment error', description: err.message, variant: 'destructive' }),
  })

  const j          = detail ?? job
  const items      = j?.service_job_items ?? j?.items ?? []
  const partsTotal = items.reduce((s, it) => s + (Number(it.qty_used) || 0) * (Number(it.unit_price) || 0), 0)
  const laborTotal = Number(j?.labor_cost) || 0
  const grandTotal = partsTotal + laborTotal

  const canManage = ['admin', 'manager'].includes(role)
  const canAct    = ['admin', 'manager', 'technician'].includes(role)
  const canModify = canAct && ['open', 'in_progress'].includes(j?.status)

  const statusActions = []
  if (j?.status === 'estimate' && canAct)
    statusActions.push({ label: 'Open Job',          nextStatus: 'open',             Icon: CheckCircle, variant: 'default' })
  if (j?.status === 'open' && canAct) {
    statusActions.push({ label: 'Start Job',          nextStatus: 'in_progress',      Icon: Play,        variant: 'default' })
    statusActions.push({ label: 'Waiting for Parts',  nextStatus: 'waiting_for_parts',Icon: Clock,       variant: 'outline' })
  }
  if (j?.status === 'in_progress' && canAct) {
    statusActions.push({ label: 'Waiting for Parts',  nextStatus: 'waiting_for_parts',Icon: Clock,       variant: 'outline' })
    if (canManage)
      statusActions.push({ label: 'Mark Complete',    nextStatus: 'completed',        Icon: CheckCircle, variant: 'default' })
  }
  if (j?.status === 'waiting_for_parts' && canAct)
    statusActions.push({ label: 'Resume Job',         nextStatus: 'in_progress',      Icon: Play,        variant: 'default' })
  if (j?.status === 'completed' && canManage)
    statusActions.push({ label: 'Mark Invoiced', nextStatus: 'invoiced', Icon: Receipt, variant: 'default' })

  if (!job) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job {j?.job_number ?? j?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">

            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{j?.customers?.name ?? '—'}</span></div>
              <div className="flex items-center gap-2"><span className="text-muted-foreground">Status:</span> {statusBadge(j?.status)}</div>
              <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{j?.vehicles?.registration_number ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Opened:</span> {formatDate(j?.created_at)}</div>
              {j?.service_type && (
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{j.service_type}</span></div>
              )}
              {j?.mileage_in != null && (
                <div><span className="text-muted-foreground">Mileage In:</span> <span className="font-medium">{Number(j.mileage_in).toLocaleString()} km</span></div>
              )}
              {j?.invoice_number && (
                <div><span className="text-muted-foreground">Invoice No:</span> <span className="font-medium">{j.invoice_number}</span></div>
              )}
            </div>

            {j?.customer_complaint && (
              <div className="rounded-md bg-muted/50 border px-3 py-2">
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Customer Complaint</p>
                <p className="italic">{j.customer_complaint}</p>
              </div>
            )}

            {/* Parts table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Parts Used</span>
                {canModify && (
                  <Button size="sm" variant="outline" onClick={() => setAddItemModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                  </Button>
                )}
              </div>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unit Price</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                      {canModify && <th className="px-3 py-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={canModify ? 5 : 4} className="px-3 py-4 text-center text-muted-foreground">No items yet.</td>
                      </tr>
                    ) : items.map((it) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2">{it.products?.name ?? it.product_id}</td>
                        <td className="px-3 py-2 text-right">{it.qty_used}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(it.unit_price)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(it.qty_used * it.unit_price)}</td>
                        {canModify && (
                          <td className="px-3 py-2">
                            <button onClick={() => setRemoveTarget(it)} className="text-destructive hover:opacity-80">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost summary */}
            <div className="rounded-md border divide-y text-sm">
              <div className="flex justify-between px-3 py-2 text-muted-foreground">
                <span>Parts subtotal</span><span>{formatCurrency(partsTotal)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-muted-foreground">
                <div>
                  <span>Labor</span>
                  {j?.labor_description && <p className="text-xs italic">{j.labor_description}</p>}
                </div>
                <span>{formatCurrency(laborTotal)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 font-semibold">
                <span>Total</span><span>{formatCurrency(grandTotal)}</span>
              </div>
              {j?.status === 'paid' && j?.payment_method && (
                <div className="flex justify-between px-3 py-2 text-muted-foreground bg-green-50/50">
                  <div>
                    <span className="text-green-700 font-medium">Paid</span>
                    <p className="text-xs">{PAYMENT_METHOD_LABELS[j.payment_method]}{j.payment_reference ? ` — ${j.payment_reference}` : ''}</p>
                    {j.payment_date && <p className="text-xs">{formatDate(j.payment_date)}</p>}
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                </div>
              )}
            </div>

            {j?.notes && <p className="text-xs text-muted-foreground italic">{j.notes}</p>}

            {/* Status action buttons */}
            {(statusActions.length > 0 || j?.status === 'invoiced' || j?.status === 'paid') && (
              <div className="flex gap-2 flex-wrap pt-1">
                {statusActions.map(({ label, nextStatus, Icon, variant }) => (
                  <Button key={nextStatus} variant={variant} size="sm" className="gap-1.5" onClick={() => statusMutation.mutate(nextStatus)} disabled={statusMutation.isPending}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </Button>
                ))}
                {j?.status === 'invoiced' && canManage && (
                  <Button size="sm" className="gap-1.5" onClick={() => setPaymentModal(true)}>
                    <DollarSign className="h-3.5 w-3.5" /> Collect Payment
                  </Button>
                )}
                {j?.status === 'paid' && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setReceiptModal(true)}>
                      <Printer className="h-3.5 w-3.5" /> View Receipt
                    </Button>
                    {canManage && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPaymentModal(true)}>
                        <Edit2 className="h-3.5 w-3.5" /> Edit Payment
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProductPickerModal
        open={addItemModal}
        onOpenChange={setAddItemModal}
        title="Add Item to Job"
        onAdd={(picked) => addItemMutation.mutate({
          inventory_id: picked.inventory_id,
          product_id:   picked.product_id,
          qty_used:     picked.qty,
          unit_price:   picked.unit_price,
        })}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove item?"
        description={`"${removeTarget?.products?.name}" will be removed and stock restored.`}
        onConfirm={() => removeItemMutation.mutate(removeTarget.id)}
        loading={removeItemMutation.isPending}
        confirmLabel="Remove"
      />

      <PaymentModal
        open={paymentModal}
        onOpenChange={setPaymentModal}
        job={j}
        partsTotal={partsTotal}
        laborTotal={laborTotal}
        grandTotal={grandTotal}
        onConfirm={(data) => paymentMutation.mutate(data)}
        saving={paymentMutation.isPending}
      />

      <ReceiptModal
        open={receiptModal}
        onOpenChange={setReceiptModal}
        job={j}
        items={items}
        partsTotal={partsTotal}
        laborTotal={laborTotal}
        grandTotal={grandTotal}
      />
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ServiceJobs() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [newModal,     setNewModal]     = useState(false)
  const [detailJob,    setDetailJob]    = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['service-jobs'], queryFn: () => api.get('/service-jobs') })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers') })
  const { data: vehicles  = [] } = useQuery({ queryKey: ['vehicles'],  queryFn: () => api.get('/vehicles')  })
  const { data: users     = [] } = useQuery({ queryKey: ['users'],     queryFn: () => api.get('/users')     })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/service-jobs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-jobs'] })
      setNewModal(false)
      toast({ title: 'Service job created', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const canCreate = ['admin', 'manager', 'technician'].includes(role)

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== 'all' && j.status !== statusFilter) return false
      if (typeFilter   !== 'all' && j.service_type !== typeFilter) return false
      const d = (j.job_date ?? j.created_at ?? '').slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo   && d > dateTo)   return false
      return true
    })
  }, [jobs, statusFilter, typeFilter, dateFrom, dateTo])

  const columns = [
    { key: 'job_number',   label: 'Job #',    render: (r) => <span className="font-medium">{r.job_number ?? r.id?.slice(0, 8)}</span> },
    { key: 'customer',     label: 'Customer', render: (r) => r.customers?.name ?? '—' },
    { key: 'vehicle',      label: 'Vehicle',  render: (r) => r.vehicles?.registration_number ?? '—' },
    { key: 'service_type', label: 'Type',     render: (r) => <span className="capitalize">{r.service_type ?? '—'}</span> },
    { key: 'status',       label: 'Status',   render: (r) => statusBadge(r.status) },
    { key: 'created_at',   label: 'Opened',   render: (r) => formatDate(r.created_at) },
    {
      key: 'actions', label: '', headerClass: 'w-12',
      render: (r) => <Button size="icon" variant="ghost" onClick={() => setDetailJob(r)}><Eye className="h-4 w-4" /></Button>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Service Jobs"
        description="Job cards for vehicle servicing"
        action={canCreate && (
          <Button onClick={() => setNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Job
          </Button>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Search by job number, customer or vehicle…"
          searchKeys={['job_number']}
          filterSlot={
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="estimate">Estimate</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_for_parts">Waiting for Parts</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="estimate">Estimate</SelectItem>
                </SelectContent>
              </Select>
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
              {(dateFrom || dateTo || typeFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter('all'); setStatusFilter('all') }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          }
          emptyMessage="No service jobs found."
        />
      )}

      <NewJobModal
        open={newModal}
        onOpenChange={setNewModal}
        customers={customers}
        vehicles={vehicles}
        users={users}
        onSave={(data) => createMutation.mutate(data)}
        saving={createMutation.isPending}
      />

      {detailJob && (
        <JobDetailModal
          job={detailJob}
          open={!!detailJob}
          onOpenChange={(open) => !open && setDetailJob(null)}
        />
      )}
    </div>
  )
}
