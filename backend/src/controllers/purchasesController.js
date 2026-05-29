const supabase = require('../config/supabase')
const stockService = require('../services/stockService')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.purchase_order_id }))
  return { ...data, id: data.purchase_order_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name), purchase_order_items(po_item_id)')
      .order('order_date', { ascending: false })
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(*), purchase_order_items(*, products(*))')
      .eq('purchase_order_id', req.params.id)
      .single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const {
      supplier_id, order_date, invoice_number, notes, items,
      payment_method, vat_type,
    } = req.body

    const totalAmount = items?.length
      ? items.reduce((sum, i) => sum + Number(i.qty_ordered) * Number(i.company_price) - Number(i.discount_amount ?? 0), 0)
      : 0

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id, order_date, invoice_number, notes,
        payment_method: payment_method ?? 'cash',
        vat_type: vat_type ?? 'non_vat',
        total_amount: totalAmount,
        status: 'pending',
        created_by: req.user.id,
      })
      .select().single()
    if (poErr) throw poErr

    if (items?.length) {
      const lineItems = items.map((i) => ({
        purchase_order_id:  po.purchase_order_id,
        product_id:         i.product_id,
        qty_ordered:        i.qty_ordered,
        qty_received:       0,
        company_price:      i.company_price,
        selling_price:      i.selling_price,
        discount_percent:   i.discount_percent  ?? 0,
        discount_amount:    i.discount_amount   ?? 0,
        reorder_level:      i.reorder_level     ?? 5,
        rack_no:            i.rack_no           ?? null,
        bin_no:             i.bin_no            ?? null,
        note:               i.note              ?? null,
        is_genuine:         i.is_genuine        ?? true,
        purchase_date:      i.purchase_date     ?? order_date,
      }))
      const { error: itemErr } = await supabase.from('purchase_order_items').insert(lineItems)
      if (itemErr) throw itemErr
    }

    res.status(201).json(addId(po))
  } catch (err) { next(err) }
}

// Complete a PO in one shot: create header + items + immediately receive into inventory
exports.complete = async (req, res, next) => {
  try {
    const {
      supplier_id, bill_date, bill_no, payment_method, vat_type, description, items,
    } = req.body

    if (!supplier_id)         return res.status(400).json({ error: 'supplier_id is required' })
    if (!bill_date)           return res.status(400).json({ error: 'bill_date is required' })
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'At least one item is required' })

    // Calculate total
    const totalAmount = items.reduce((sum, i) => {
      const subtotal = Number(i.qty) * Number(i.company_price)
      return sum + subtotal - Number(i.discount_amount ?? 0)
    }, 0)

    // Create PO
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id,
        order_date:     bill_date,
        received_date:  bill_date,
        invoice_number: bill_no ?? null,
        notes:          description ?? null,
        payment_method: payment_method ?? 'cash',
        vat_type:       vat_type ?? 'non_vat',
        total_amount:   totalAmount,
        status:         'received',
        created_by:     req.user.id,
      })
      .select().single()
    if (poErr) throw poErr

    // Create PO items
    const lineItems = items.map((i) => ({
      purchase_order_id: po.purchase_order_id,
      product_id:        i.product_id,
      qty_ordered:       Number(i.qty),
      qty_received:      Number(i.qty),
      company_price:     Number(i.company_price),
      selling_price:     Number(i.selling_price),
      discount_percent:  Number(i.discount_percent  ?? 0),
      discount_amount:   Number(i.discount_amount   ?? 0),
      reorder_level:     Number(i.reorder_level     ?? 5),
      rack_no:           i.rack_no    ?? null,
      bin_no:            i.bin_no     ?? null,
      note:              i.note       ?? null,
      is_genuine:        i.is_genuine ?? true,
      purchase_date:     i.purchase_date ?? bill_date,
    }))

    const { data: savedItems, error: itemErr } = await supabase
      .from('purchase_order_items')
      .insert(lineItems)
      .select()
    if (itemErr) throw itemErr

    // Push into inventory
    await stockService.receivePurchaseOrder(
      po.purchase_order_id,
      bill_date,
      savedItems.map((item, idx) => ({
        po_item_id:       item.po_item_id,
        product_id:       item.product_id,
        qty_received:     item.qty_received,
        supplier_id,
        company_price:    item.company_price,
        selling_price:    item.selling_price,
        reorder_level:    item.reorder_level,
        rack_no:          item.rack_no,
        bin_no:           item.bin_no,
        is_genuine:       item.is_genuine,
        discount_percent: item.discount_percent,
      })),
      true, // already received — skip status update in service
    )

    res.status(201).json(addId(po))
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const { supplier_id, order_date, invoice_number, notes, payment_method, vat_type } = req.body
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ supplier_id, order_date, invoice_number, notes, payment_method, vat_type })
      .eq('purchase_order_id', req.params.id)
      .eq('status', 'pending')
      .select().single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.receive = async (req, res, next) => {
  try {
    const { received_date, items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' })
    }
    const { data: po, error: poFetchErr } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('purchase_order_id', req.params.id)
      .single()
    if (poFetchErr) throw poFetchErr
    if (po.status !== 'pending') {
      return res.status(400).json({ error: `PO is already ${po.status}` })
    }
    await stockService.receivePurchaseOrder(req.params.id, received_date, items)

    // Recalculate and persist total_amount from the actual received items
    const { data: poItems } = await supabase
      .from('purchase_order_items')
      .select('qty_received, company_price, discount_amount')
      .eq('purchase_order_id', req.params.id)
    if (poItems?.length) {
      const totalAmount = poItems.reduce(
        (sum, i) => sum + Number(i.qty_received) * Number(i.company_price) - Number(i.discount_amount ?? 0), 0,
      )
      await supabase
        .from('purchase_orders')
        .update({ total_amount: totalAmount })
        .eq('purchase_order_id', req.params.id)
    }

    res.json({ success: true })
  } catch (err) { next(err) }
}

exports.cancel = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled' })
      .eq('purchase_order_id', req.params.id)
      .eq('status', 'pending')
    if (error) throw error
    res.json({ success: true })
  } catch (err) { next(err) }
}
