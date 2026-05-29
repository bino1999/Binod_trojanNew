import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Eye, CheckCircle, XCircle, ArrowLeft, ArrowRight,
  Package, Trash2, ShoppingCart, ClipboardList, BadgeCheck, Printer,
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

// ─── helpers ────────────────────────────────────────────────────────────────

function statusBadge(status) {
  const map = { pending: 'warning', received: 'success', cancelled: 'muted' }
  return <Badge variant={map[status] ?? 'secondary'} className="capitalize">{status}</Badge>
}

const VAT_LABELS = { non_vat: 'Non VAT', vat_inclusive: 'VAT Inclusive', vat_exclusive: 'VAT Exclusive' }
const PM_LABELS  = { cash: 'Cash', cheque: 'Cheque', card: 'Card', credit: 'Credit', bank_transfer: 'Bank Transfer' }

// ─── Receipt helpers ─────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildReceiptHtml({ supplier, header, items, receiptNo, completedAt }) {
  const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }
    catch { return d }
  }

  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.company_price), 0)
  const totalDiscount = items.reduce((s, it) => s + Number(it.discount_amount || 0), 0)
  const grandTotal = subtotal - totalDiscount

  const VAT_LABELS = { non_vat: 'Non VAT', vat_inclusive: 'VAT Inclusive', vat_exclusive: 'VAT Exclusive' }
  const PM_LABELS  = { cash: 'Cash', cheque: 'Cheque', card: 'Card', credit: 'Credit', bank_transfer: 'Bank Transfer' }

  const itemRows = items.map((it, i) => {
    const total = Number(it.qty) * Number(it.company_price) - Number(it.discount_amount || 0)
    const discount = Number(it.discount_amount) > 0 ? `- ${fmt(it.discount_amount)}` : '&mdash;'
    return `
      <tr>
        <td style="padding:8px 10px;color:#6b7280;border-bottom:1px solid #f3f4f6">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">
          <strong>${esc(it.product_name)}</strong>
          ${it.brand ? `<br><small style="color:#9ca3af">${esc(it.brand)}</small>` : ''}
        </td>
        <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #f3f4f6">${esc(it.qty)}</td>
        <td style="padding:8px 10px;text-align:center;color:#6b7280;border-bottom:1px solid #f3f4f6">${esc(it.unit) || '&mdash;'}</td>
        <td style="padding:8px 10px;text-align:right;border-bottom:1px solid #f3f4f6">${fmt(it.company_price)}</td>
        <td style="padding:8px 10px;text-align:right;color:#059669;border-bottom:1px solid #f3f4f6">${discount}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6">${fmt(total)}</td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Purchase Receipt ${esc(receiptNo)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; padding: 32px; max-width: 780px; margin: 0 auto; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
  <div style="text-align:center;border-bottom:2px solid #1f2937;padding-bottom:14px;margin-bottom:20px">
    <h1 style="font-size:20px;font-weight:800;letter-spacing:0.05em">PURCHASE RECEIPT</h1>
    <p style="font-size:11px;color:#6b7280;margin-top:3px">Goods Received Note</p>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:18px">
    <div>
      <p style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:3px">Supplier</p>
      <p style="font-size:15px;font-weight:700">${esc(supplier?.name)}</p>
      ${supplier?.contact_person ? `<p style="color:#6b7280;margin-top:2px">${esc(supplier.contact_person)}</p>` : ''}
      ${supplier?.phone ? `<p style="color:#6b7280">${esc(supplier.phone)}</p>` : ''}
      ${supplier?.email ? `<p style="color:#6b7280">${esc(supplier.email)}</p>` : ''}
      ${supplier?.address ? `<p style="color:#9ca3af;font-size:11px;margin-top:2px">${esc(supplier.address)}</p>` : ''}
    </div>
    <div style="text-align:right">
      <p style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:3px">Receipt Details</p>
      <p style="font-family:monospace;font-weight:700;font-size:13px">${esc(receiptNo)}</p>
      <p style="color:#6b7280;margin-top:2px">${fmtDate(completedAt)}</p>
      ${header.bill_no ? `<p style="color:#6b7280;margin-top:2px">Bill No: <span style="font-family:monospace;font-weight:600">${esc(header.bill_no)}</span></p>` : ''}
      <p style="color:#6b7280">${fmtDate(header.bill_date)}</p>
    </div>
  </div>

  <div style="display:flex;gap:24px;background:#f9fafb;border-radius:6px;padding:10px 14px;margin-bottom:18px">
    <div>
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700">Payment Method</p>
      <p style="font-weight:600;margin-top:2px">${esc(PM_LABELS[header.payment_method] ?? header.payment_method)}</p>
    </div>
    <div style="border-left:1px solid #e5e7eb;padding-left:24px">
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700">VAT Type</p>
      <p style="font-weight:600;margin-top:2px">${esc(VAT_LABELS[header.vat_type] ?? header.vat_type)}</p>
    </div>
  </div>

  <table style="margin-bottom:16px">
    <thead>
      <tr style="background:#1f2937;color:#fff">
        <th style="padding:9px 10px;text-align:left;font-size:11px">#</th>
        <th style="padding:9px 10px;text-align:left;font-size:11px">Product</th>
        <th style="padding:9px 10px;text-align:center;font-size:11px">Qty</th>
        <th style="padding:9px 10px;text-align:center;font-size:11px">Unit</th>
        <th style="padding:9px 10px;text-align:right;font-size:11px">Unit Price</th>
        <th style="padding:9px 10px;text-align:right;font-size:11px">Discount</th>
        <th style="padding:9px 10px;text-align:right;font-size:11px">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:18px">
    <div style="width:220px">
      <div style="display:flex;justify-content:space-between;padding:3px 0;color:#6b7280">
        <span>Subtotal</span><span>${fmt(subtotal)}</span>
      </div>
      ${totalDiscount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:3px 0;color:#059669">
        <span>Total Discount</span><span>- ${fmt(totalDiscount)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:7px 0 3px;border-top:2px solid #1f2937;font-size:15px;font-weight:700;margin-top:3px">
        <span>Grand Total</span><span style="color:#1d4ed8">${fmt(grandTotal)}</span>
      </div>
    </div>
  </div>

  ${header.description ? `
  <div style="border-top:1px solid #e5e7eb;padding-top:10px;margin-bottom:14px">
    <p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:3px">Notes</p>
    <p style="color:#4b5563">${esc(header.description)}</p>
  </div>` : ''}

  <div style="border-top:1px solid #e5e7eb;padding-top:10px;text-align:center">
    <p style="font-size:10px;color:#9ca3af">This is a computer-generated receipt &mdash; no signature required</p>
  </div>
</body></html>`
}

// ─── Purchase Receipt Modal ──────────────────────────────────────────────────

function PurchaseReceiptModal({ data, suppliers, open, onClose }) {
  if (!data) return null

  const { header, items, receiptNo, completedAt } = data
  const supplier = suppliers.find((s) => s.supplier_id === header.supplier_id)

  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.company_price), 0)
  const totalDiscount = items.reduce((s, it) => s + Number(it.discount_amount || 0), 0)
  const grandTotal = subtotal - totalDiscount

  function handlePrint() {
    const html = buildReceiptHtml({ supplier, header, items, receiptNo, completedAt })
    const win = window.open('', '_blank', 'width=860,height=700')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Purchase Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Receipt preview */}
        <div className="border rounded-xl p-6 space-y-4 bg-white text-gray-900 text-sm">
          {/* Title */}
          <div className="text-center border-b pb-4">
            <h2 className="text-lg font-extrabold tracking-wide">PURCHASE RECEIPT</h2>
            <p className="text-xs text-gray-500 mt-0.5">Goods Received Note</p>
          </div>

          {/* Supplier + receipt info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Supplier</p>
              <p className="font-bold text-base text-gray-900">{supplier?.name ?? '—'}</p>
              {supplier?.contact_person && <p className="text-gray-500 text-xs mt-0.5">{supplier.contact_person}</p>}
              {supplier?.phone        && <p className="text-gray-500 text-xs">{supplier.phone}</p>}
              {supplier?.email        && <p className="text-gray-500 text-xs">{supplier.email}</p>}
              {supplier?.address      && <p className="text-gray-400 text-xs mt-0.5">{supplier.address}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Receipt Details</p>
              <p className="font-mono font-bold">{receiptNo}</p>
              <p className="text-gray-500 text-xs mt-0.5">{new Date(completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              {header.bill_no && (
                <p className="text-gray-500 text-xs">Bill No: <span className="font-mono font-semibold">{header.bill_no}</span></p>
              )}
              <p className="text-gray-500 text-xs">{new Date(header.bill_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Payment info */}
          <div className="flex gap-6 bg-gray-50 rounded-lg px-4 py-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Payment Method</p>
              <p className="font-semibold mt-0.5">{PM_LABELS[header.payment_method] ?? header.payment_method}</p>
            </div>
            <div className="border-l pl-6">
              <p className="text-[10px] text-gray-400 uppercase font-bold">VAT Type</p>
              <p className="font-semibold mt-0.5">{VAT_LABELS[header.vat_type] ?? header.vat_type}</p>
            </div>
          </div>

          {/* Items table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Product</th>
                <th className="px-3 py-2 text-center font-semibold">Qty</th>
                <th className="px-3 py-2 text-center font-semibold">Unit</th>
                <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                <th className="px-3 py-2 text-right font-semibold">Discount</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const total = Number(it.qty) * Number(it.company_price) - Number(it.discount_amount || 0)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold">{it.product_name}</p>
                      {it.brand && <p className="text-gray-400">{it.brand}</p>}
                    </td>
                    <td className="px-3 py-2 text-center">{it.qty}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{it.unit || '—'}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(it.company_price)}</td>
                    <td className="px-3 py-2 text-right text-green-600">
                      {Number(it.discount_amount) > 0 ? `- ${formatCurrency(it.discount_amount)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-52 space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Total Discount</span><span>- {formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-gray-800 pt-1.5 mt-1">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {header.description && (
            <div className="border-t pt-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Notes</p>
              <p className="text-gray-600">{header.description}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-3 text-center">
            <p className="text-[10px] text-gray-400">This is a computer-generated receipt — no signature required</p>
          </div>
        </div>

        <div className="flex justify-between pt-1">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Step indicator ─────────────────────────────────────────────────────────

function StepBar({ step }) {
  const steps = [
    { n: 1, label: 'Order Details', icon: ClipboardList },
    { n: 2, label: 'Add Items',     icon: Package },
    { n: 3, label: 'Review & Complete', icon: BadgeCheck },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const Icon = s.icon
        const active   = step === s.n
        const done     = step > s.n
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${active ? 'bg-primary text-primary-foreground shadow-md' : done ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${active ? 'bg-primary-foreground/20' : done ? 'bg-primary/10' : 'bg-muted'}`}>
                {done ? <CheckCircle className="w-4 h-4 text-primary" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 rounded ${step > s.n ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1 — Order Header ───────────────────────────────────────────────────

function Step1({ header, setHeader, suppliers, onNext, onCancel }) {
  const set = (k, v) => setHeader((p) => ({ ...p, [k]: v }))
  const canNext = header.supplier_id && header.bill_date && header.payment_method && header.vat_type

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Order Details</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set up the supplier and billing information for this purchase</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Supplier */}
          <div>
            <Label className="text-sm font-medium">Supplier <span className="text-destructive">*</span></Label>
            <Select value={header.supplier_id} onValueChange={(v) => set('supplier_id', v)}>
              <SelectTrigger className="mt-1.5 h-10">
                <SelectValue placeholder="Select a supplier…" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.filter((s) => s.is_active !== false).map((s) => (
                  <SelectItem key={s.supplier_id} value={s.supplier_id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Bill No */}
            <div>
              <Label className="text-sm font-medium">Bill No</Label>
              <Input
                className="mt-1.5 h-10"
                placeholder="e.g. BM100"
                value={header.bill_no}
                onChange={(e) => set('bill_no', e.target.value)}
              />
            </div>
            {/* Bill Date */}
            <div>
              <Label className="text-sm font-medium">Bill Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                className="mt-1.5 h-10"
                value={header.bill_date}
                onChange={(e) => set('bill_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Method */}
            <div>
              <Label className="text-sm font-medium">Payment Method <span className="text-destructive">*</span></Label>
              <Select value={header.payment_method} onValueChange={(v) => set('payment_method', v)}>
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* VAT Type */}
            <div>
              <Label className="text-sm font-medium">VAT Type <span className="text-destructive">*</span></Label>
              <Select value={header.vat_type} onValueChange={(v) => set('vat_type', v)}>
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_vat">Non VAT</SelectItem>
                  <SelectItem value="vat_inclusive">VAT Inclusive</SelectItem>
                  <SelectItem value="vat_exclusive">VAT Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              className="mt-1.5 resize-none"
              rows={2}
              placeholder="Optional notes about this purchase…"
              value={header.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onNext} disabled={!canNext}>
            Next — Add Items <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2 — Add Items ──────────────────────────────────────────────────────

const EMPTY_ITEM = {
  product_id: '', category: '', brand: '', barcode: '', unit: '',
  purchase_date: new Date().toISOString().slice(0, 10),
  is_genuine: true,
  qty: '', reorder_level: '5', selling_price: '',
  company_price: '', discount_percent: '', discount_amount: '0',
  rack_no: '', bin_no: '', note: '',
}

function Step2({ header, items, setItems, products, suppliers, onNext, onBack }) {
  const [form, setForm]               = useState(EMPTY_ITEM)
  const [categoryFilter, setCategory] = useState('')
  const [brandFilter, setBrand]       = useState('')

  const supplierName = suppliers.find((s) => s.supplier_id === header.supplier_id)?.name ?? ''

  // Build unique categories & brands from active products
  const categories = useMemo(() => [...new Set(products.filter((p) => p.is_active !== false).map((p) => p.category).filter(Boolean))].sort(), [products])
  const brands = useMemo(() => [...new Set(products.filter((p) => p.is_active !== false && p.brand).map((p) => p.brand))].sort(), [products])

  // Filtered product list for the dropdown
  const filteredProducts = useMemo(() => products.filter((p) => {
    if (p.is_active === false) return false
    if (categoryFilter && p.category !== categoryFilter) return false
    if (brandFilter && p.brand !== brandFilter) return false
    return true
  }), [products, categoryFilter, brandFilter])

  function setF(k, v) { setForm((p) => ({ ...p, [k]: v })) }

  function handleProductSelect(productId) {
    const p = products.find((x) => x.product_id === productId)
    if (!p) return
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      category:   p.category ?? '',
      brand:      p.brand    ?? '',
      barcode:    p.barcode  ?? '',
      unit:       p.unit     ?? '',
    }))
  }

  function handleDiscountPercent(val) {
    const pct = parseFloat(val) || 0
    const cost = parseFloat(form.company_price) || 0
    const qty  = parseFloat(form.qty) || 0
    const amt  = ((cost * qty) * pct / 100).toFixed(2)
    setForm((p) => ({ ...p, discount_percent: val, discount_amount: amt }))
  }

  function handleCompanyPrice(val) {
    const cost = parseFloat(val) || 0
    const qty  = parseFloat(form.qty) || 0
    const pct  = parseFloat(form.discount_percent) || 0
    const amt  = ((cost * qty) * pct / 100).toFixed(2)
    setForm((p) => ({ ...p, company_price: val, discount_amount: amt }))
  }

  function handleQty(val) {
    const qty  = parseFloat(val) || 0
    const cost = parseFloat(form.company_price) || 0
    const pct  = parseFloat(form.discount_percent) || 0
    const amt  = ((cost * qty) * pct / 100).toFixed(2)
    setForm((p) => ({ ...p, qty: val, discount_amount: amt }))
  }

  function clearFilters() { setCategory(''); setBrand('') }

  function addItem() {
    if (!form.product_id || !form.qty || !form.company_price || !form.selling_price) {
      toast({ title: 'Fill required fields', description: 'Product, Quantity, Company Price and Sale Price are required.', variant: 'destructive' })
      return
    }
    const product = products.find((p) => p.product_id === form.product_id)
    setItems((prev) => [...prev, { ...form, product_name: product?.name ?? form.product_id }])
    setForm({ ...EMPTY_ITEM, purchase_date: form.purchase_date })
  }

  function removeItem(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)) }

  const canNext = items.length > 0

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl px-5 py-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Supplier</p>
          <p className="font-semibold text-primary">{supplierName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Bill No</p>
          <p className="font-semibold">{header.bill_no || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">VAT</p>
          <p className="font-semibold">{VAT_LABELS[header.vat_type] ?? header.vat_type}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Item form */}
        <div className="xl:col-span-2 bg-card border rounded-2xl shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Item Details</h3>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrand}>
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue placeholder="Select Brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            {(categoryFilter || brandFilter) && (
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>

          {/* Product + unit row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Select Product <span className="text-destructive">*</span></Label>
              <Select value={form.product_id} onValueChange={handleProductSelect}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Select Product…" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((p) => (
                    <SelectItem key={p.product_id} value={p.product_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="text-xs">Unit</Label>
              <Input value={form.unit} readOnly className="mt-1 h-9 text-xs bg-muted/40" placeholder="—" />
            </div>
          </div>

          {/* Auto-fill read-only row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Category</Label>
              <Input value={form.category} readOnly className="mt-1 h-9 text-xs bg-muted/40" placeholder="—" />
            </div>
            <div>
              <Label className="text-xs">Brand</Label>
              <Input value={form.brand} readOnly className="mt-1 h-9 text-xs bg-muted/40" placeholder="—" />
            </div>
            <div>
              <Label className="text-xs">Barcode</Label>
              <Input value={form.barcode} readOnly className="mt-1 h-9 text-xs bg-muted/40" placeholder="—" />
            </div>
          </div>

          {/* Date + genuine */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label className="text-xs">Purchase Date <span className="text-destructive">*</span></Label>
              <Input type="date" className="mt-1 h-9 text-xs" value={form.purchase_date} onChange={(e) => setF('purchase_date', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="genuine"
                checked={form.is_genuine}
                onCheckedChange={(v) => setF('is_genuine', !!v)}
              />
              <Label htmlFor="genuine" className="text-sm cursor-pointer select-none">Genuine</Label>
            </div>
          </div>

          {/* Qty / Reorder / Sale Price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Quantity <span className="text-destructive">*</span></Label>
              <Input type="number" min="1" placeholder="0" className="mt-1 h-9 text-xs font-semibold"
                value={form.qty} onChange={(e) => handleQty(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Reorder Level <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" placeholder="5" className="mt-1 h-9 text-xs"
                value={form.reorder_level} onChange={(e) => setF('reorder_level', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Sale Price <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" className="mt-1 h-9 text-xs"
                value={form.selling_price} onChange={(e) => setF('selling_price', e.target.value)} />
            </div>
          </div>

          {/* Company Price / Discount */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Company Price <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" className="mt-1 h-9 text-xs font-semibold"
                value={form.company_price} onChange={(e) => handleCompanyPrice(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Discount %</Label>
              <Input type="number" min="0" max="100" step="0.01" placeholder="0" className="mt-1 h-9 text-xs"
                value={form.discount_percent} onChange={(e) => handleDiscountPercent(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Discount Amount</Label>
              <Input readOnly className="mt-1 h-9 text-xs bg-muted/40" value={form.discount_amount} />
            </div>
          </div>

          {/* Rack / Bin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Rack No</Label>
              <Input className="mt-1 h-9 text-xs" placeholder="e.g. R-01" value={form.rack_no} onChange={(e) => setF('rack_no', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Bin No</Label>
              <Input className="mt-1 h-9 text-xs" placeholder="e.g. B-05" value={form.bin_no} onChange={(e) => setF('bin_no', e.target.value)} />
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="text-xs">Note</Label>
            <Textarea className="mt-1 resize-none text-xs" rows={2} placeholder="Optional note for this item…"
              value={form.note} onChange={(e) => setF('note', e.target.value)} />
          </div>

          <Button onClick={addItem} className="w-full gap-2 h-10">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>

        {/* Right panel — added items preview */}
        <div className="bg-card border rounded-2xl shadow-sm p-5 flex flex-col">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
            Added Items <span className="ml-1 text-primary">{items.length > 0 && `(${items.length})`}</span>
          </h3>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No items yet.</p>
              <p className="text-xs mt-1">Add items from the form.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-96">
              {items.map((it, i) => {
                const subtotal = Number(it.qty) * Number(it.company_price) - Number(it.discount_amount || 0)
                return (
                  <div key={i} className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-muted/20 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{it.product_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {it.qty} × {formatCurrency(it.company_price)}
                        {Number(it.discount_amount) > 0 && <span className="text-green-600"> − {formatCurrency(it.discount_amount)}</span>}
                      </p>
                      <p className="text-xs font-medium text-primary mt-0.5">{formatCurrency(subtotal)}</p>
                    </div>
                    <button onClick={() => removeItem(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5 opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="text-primary">
                  {formatCurrency(items.reduce((s, it) => s + Number(it.qty) * Number(it.company_price) - Number(it.discount_amount || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!canNext}>
          Review Order <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3 — Review & Complete ──────────────────────────────────────────────

function Step3({ header, items, suppliers, onComplete, onBack, completing }) {
  const supplierName = suppliers.find((s) => s.supplier_id === header.supplier_id)?.name ?? '—'
  const grandTotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.company_price) - Number(it.discount_amount || 0), 0)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Summary header */}
      <div className="bg-card border rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Purchase Order Summary</p>
            <h2 className="text-xl font-bold text-primary">{supplierName}</h2>
            {header.bill_no && <p className="text-sm text-muted-foreground mt-1">Bill No: <span className="font-mono font-semibold text-foreground">{header.bill_no}</span></p>}
          </div>
          <div className="text-right space-y-1">
            <Badge variant="outline" className="text-xs">{VAT_LABELS[header.vat_type] ?? header.vat_type}</Badge>
            <p className="text-xs text-muted-foreground">{PM_LABELS[header.payment_method] ?? header.payment_method}</p>
            <p className="text-xs text-muted-foreground">{formatDate(header.bill_date)}</p>
          </div>
        </div>
        {header.description && <p className="mt-3 text-sm text-muted-foreground italic border-t pt-3">{header.description}</p>}
      </div>

      {/* Items table */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground text-xs">
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Product</th>
              <th className="px-4 py-3 text-center font-semibold">Qty</th>
              <th className="px-4 py-3 text-center font-semibold">Unit</th>
              <th className="px-4 py-3 text-right font-semibold">Buying Price</th>
              <th className="px-4 py-3 text-right font-semibold">Discount</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const subtotal = Number(it.qty) * Number(it.company_price) - Number(it.discount_amount || 0)
              return (
                <tr key={i} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{it.product_name}</p>
                    {(it.rack_no || it.bin_no) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {it.rack_no && `Rack: ${it.rack_no}`}{it.rack_no && it.bin_no && ' · '}{it.bin_no && `Bin: ${it.bin_no}`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{it.qty}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{it.unit || '—'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(it.company_price)}</td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {Number(it.discount_amount) > 0 ? `- ${formatCurrency(it.discount_amount)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(subtotal)}</td>
                </tr>
              )
            })}
            <tr className="border-t bg-muted/30">
              <td colSpan={6} className="px-4 py-3 text-right font-bold text-sm">Grand Total</td>
              <td className="px-4 py-3 text-right font-bold text-primary text-base">{formatCurrency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} disabled={completing}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          size="lg"
          className="gap-2 bg-green-600 hover:bg-green-700 text-white px-8"
          onClick={onComplete}
          disabled={completing}
        >
          <CheckCircle className="h-5 w-5" />
          {completing ? 'Processing…' : 'Complete Purchase Order'}
        </Button>
      </div>
    </div>
  )
}

// ─── PO Detail Modal ─────────────────────────────────────────────────────────

function PODetailModal({ po, open, onOpenChange, onReceive, onCancel, receiving, cancelling }) {
  if (!po) return null
  const items = po.purchase_order_items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Purchase Order</span>
            {po.invoice_number && <span className="font-mono text-sm text-muted-foreground">— {po.invoice_number}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-muted/30 rounded-xl p-4">
            <div><span className="text-muted-foreground text-xs">Supplier</span><p className="font-semibold mt-0.5">{po.suppliers?.name ?? '—'}</p></div>
            <div><span className="text-muted-foreground text-xs">Status</span><p className="mt-0.5">{statusBadge(po.status)}</p></div>
            <div><span className="text-muted-foreground text-xs">Order Date</span><p className="font-medium mt-0.5">{formatDate(po.order_date)}</p></div>
            <div><span className="text-muted-foreground text-xs">Total</span><p className="font-semibold text-primary mt-0.5">{formatCurrency(po.total_amount)}</p></div>
            {po.payment_method && <div><span className="text-muted-foreground text-xs">Payment</span><p className="font-medium mt-0.5">{PM_LABELS[po.payment_method] ?? po.payment_method}</p></div>}
            {po.vat_type && <div><span className="text-muted-foreground text-xs">VAT</span><p className="font-medium mt-0.5">{VAT_LABELS[po.vat_type] ?? po.vat_type}</p></div>}
          </div>

          {po.notes && <p className="text-muted-foreground italic text-xs px-1">{po.notes}</p>}

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Product</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Cost</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Selling</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No items.</td></tr>
                ) : items.map((it, i) => (
                  <tr key={it.po_item_id ?? i} className="border-t">
                    <td className="px-3 py-2.5">{it.products?.name ?? it.product_id}</td>
                    <td className="px-3 py-2.5 text-right">{it.qty_ordered}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(it.company_price)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(it.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {po.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 gap-1.5" onClick={onReceive} disabled={receiving || items.length === 0}>
                <CheckCircle className="h-4 w-4" />
                {receiving ? 'Receiving…' : 'Mark Received'}
              </Button>
              <Button variant="destructive" className="flex-1 gap-1.5" onClick={onCancel} disabled={cancelling}>
                <XCircle className="h-4 w-4" />
                {cancelling ? 'Cancelling…' : 'Cancel PO'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

const EMPTY_HEADER = {
  supplier_id: '', bill_no: '', bill_date: new Date().toISOString().slice(0, 10),
  payment_method: 'cash', vat_type: 'non_vat', description: '',
}

export default function Purchases() {
  const { role } = useAuthStore()
  const qc = useQueryClient()

  const [view, setView]           = useState('list')   // 'list' | 'create'
  const [step, setStep]           = useState(1)
  const [header, setHeader]       = useState(EMPTY_HEADER)
  const [poItems, setPoItems]     = useState([])
  const [detailPO, setDetailPO]         = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo,   setDateTo]           = useState('')
  const [receiptData, setReceiptData]   = useState(null)

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases'),
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers'),
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  })
  const { data: poDetail } = useQuery({
    queryKey: ['purchase', detailPO?.purchase_order_id],
    queryFn: () => api.get(`/purchases/${detailPO.purchase_order_id}`),
    enabled: !!detailPO?.purchase_order_id,
  })

  const completeMutation = useMutation({
    mutationFn: (data) => api.post('/purchases/complete', data),
    onSuccess: (po) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      const shortId = po?.purchase_order_id?.slice(0, 8).toUpperCase() ?? '—'
      const receipt = {
        header:      { ...header },
        items:       [...poItems],
        receiptNo:   po?.invoice_number ?? `PO-${shortId}`,
        completedAt: new Date().toISOString(),
      }
      // Return to list view, then open receipt modal over it
      setView('list'); setStep(1); setHeader(EMPTY_HEADER); setPoItems([])
      setReceiptData(receipt)
      toast({ title: 'Purchase order completed', description: 'Items added to inventory.', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err?.error ?? err?.message ?? 'Failed', variant: 'destructive' }),
  })

  const receiveMutation = useMutation({
    mutationFn: ({ id, body }) => api.post(`/purchases/${id}/receive`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setDetailPO(null)
      toast({ title: 'PO received — inventory updated', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err?.error ?? err?.message ?? 'Failed', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/purchases/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      setDetailPO(null)
      toast({ title: 'PO cancelled', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Error', description: err?.error ?? err?.message ?? 'Failed', variant: 'destructive' }),
  })

  function resetCreate() { setView('list'); setStep(1); setHeader(EMPTY_HEADER); setPoItems([]); setReceiptData(null) }

  function startCreate() { resetCreate(); setView('create') }

  function handleComplete() {
    completeMutation.mutate({
      supplier_id:    header.supplier_id,
      bill_date:      header.bill_date,
      bill_no:        header.bill_no || undefined,
      payment_method: header.payment_method,
      vat_type:       header.vat_type,
      description:    header.description || undefined,
      items: poItems.map((it) => ({
        product_id:      it.product_id,
        qty:             Number(it.qty),
        company_price:   Number(it.company_price),
        selling_price:   Number(it.selling_price),
        discount_percent: Number(it.discount_percent || 0),
        discount_amount:  Number(it.discount_amount  || 0),
        reorder_level:   Number(it.reorder_level || 5),
        rack_no:         it.rack_no   || undefined,
        bin_no:          it.bin_no    || undefined,
        note:            it.note      || undefined,
        is_genuine:      it.is_genuine,
        purchase_date:   it.purchase_date,
      })),
    })
  }

  function handleReceive() {
    if (!poDetail) return
    const items = poDetail.purchase_order_items ?? []
    receiveMutation.mutate({
      id: poDetail.purchase_order_id,
      body: {
        received_date: new Date().toISOString().slice(0, 10),
        items: items.map((item) => ({
          po_item_id:    item.po_item_id,
          product_id:    item.product_id,
          qty_received:  item.qty_ordered,
          supplier_id:   poDetail.supplier_id,
          company_price: item.company_price,
          selling_price: item.selling_price,
        })),
      },
    })
  }

  const canCreate = ['admin', 'manager', 'warehouse'].includes(role)

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (supplierFilter !== 'all' && p.suppliers?.name !== supplierFilter) return false
      const d = (p.order_date ?? p.created_at ?? '').slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo   && d > dateTo)   return false
      return true
    })
  }, [purchases, statusFilter, supplierFilter, dateFrom, dateTo])

  const supplierNames = useMemo(() => {
    const names = [...new Set(purchases.map((p) => p.suppliers?.name).filter(Boolean))].sort()
    return names
  }, [purchases])
  const modalPO   = poDetail ?? detailPO

  const columns = [
    {
      key: 'po_ref', label: 'Bill / Ref',
      render: (r) => <span className="font-medium font-mono text-xs">{r.invoice_number ?? r.purchase_order_id?.slice(0, 8)}</span>,
    },
    { key: 'supplier', label: 'Supplier', render: (r) => <span className="font-medium">{r.suppliers?.name ?? '—'}</span> },
    {
      key: 'items', label: 'Items',
      render: (r) => {
        const count = r.purchase_order_items?.length ?? 0
        return <span className="text-xs text-muted-foreground">{count} {count === 1 ? 'item' : 'items'}</span>
      },
    },
    { key: 'order_date', label: 'Date', render: (r) => formatDate(r.order_date) },
    {
      key: 'payment_method', label: 'Payment',
      render: (r) => <span className="text-xs">{PM_LABELS[r.payment_method] ?? r.payment_method ?? '—'}</span>,
    },
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    { key: 'total_amount', label: 'Total', render: (r) => <span className="font-semibold">{formatCurrency(r.total_amount)}</span> },
    {
      key: 'actions', label: '', headerClass: 'w-12',
      render: (r) => (
        <Button size="icon" variant="ghost" onClick={() => setDetailPO(r)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  // ── Wizard view ──
  if (view === 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={resetCreate} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Purchase Orders
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-sm">New Purchase Order</span>
        </div>

        <StepBar step={step} />

        {step === 1 && (
          <Step1
            header={header}
            setHeader={setHeader}
            suppliers={suppliers}
            onNext={() => setStep(2)}
            onCancel={resetCreate}
          />
        )}
        {step === 2 && (
          <Step2
            header={header}
            items={poItems}
            setItems={setPoItems}
            products={products}
            suppliers={suppliers}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3
            header={header}
            items={poItems}
            suppliers={suppliers}
            onComplete={handleComplete}
            onBack={() => setStep(2)}
            completing={completeMutation.isPending}
          />
        )}
      </div>
    )
  }

  // ── List view ──
  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Receive stock from suppliers — complete a purchase order to update inventory"
        action={canCreate && (
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Purchase Order
          </Button>
        )}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Search by bill / invoice number…"
          searchKeys={['invoice_number']}
          filterSlot={
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {supplierNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
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
              {(dateFrom || dateTo || statusFilter !== 'all' || supplierFilter !== 'all') && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setSupplierFilter('all') }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          }
          emptyMessage="No purchase orders found."
        />
      )}

      <PODetailModal
        po={modalPO}
        open={!!detailPO}
        onOpenChange={(open) => { if (!open) setDetailPO(null) }}
        onReceive={handleReceive}
        onCancel={() => cancelMutation.mutate(modalPO?.purchase_order_id)}
        receiving={receiveMutation.isPending}
        cancelling={cancelMutation.isPending}
      />

      <PurchaseReceiptModal
        data={receiptData}
        suppliers={suppliers}
        open={!!receiptData}
        onClose={resetCreate}
      />
    </div>
  )
}
