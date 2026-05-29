const supabase = require('../config/supabase')
const stockService = require('../services/stockService')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.job_id }))
  return { ...data, id: data.job_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('service_jobs')
      .select('*, customers(name), vehicles(plate_number, registration_number, make, model)')
      .order('job_date', { ascending: false })
    if (error) throw error
    const mapped = (data ?? []).map(r => ({
      ...r,
      id: r.job_id,
      vehicles: r.vehicles
        ? { ...r.vehicles, registration_number: r.vehicles.registration_number ?? r.vehicles.plate_number }
        : null,
    }))
    res.json(mapped)
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('service_jobs')
      .select('*, customers(*), vehicles(*), service_job_items(*, products(*), inventory(selling_price))')
      .eq('job_id', req.params.id)
      .single()
    if (error) throw error
    const result = {
      ...data,
      id: data.job_id,
      vehicles: data.vehicles
        ? { ...data.vehicles, registration_number: data.vehicles.registration_number ?? data.vehicles.plate_number }
        : null,
      service_job_items: (data.service_job_items ?? []).map(i => ({ ...i, id: i.job_item_id })),
    }
    res.json(result)
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const {
      customer_id, vehicle_id,
      assigned_technician, technician_id,
      job_date, labor_description, labor_cost, notes,
      mileage_in, customer_complaint, service_type,
    } = req.body

    const techId = assigned_technician ?? technician_id ?? null
    const date   = job_date ?? new Date().toISOString().slice(0, 10)
    const svcType = service_type ?? 'normal'
    // Estimate jobs start with status 'estimate'; all others start 'open'
    const initialStatus = svcType === 'estimate' ? 'estimate' : 'open'

    const { data, error } = await supabase
      .from('service_jobs')
      .insert({
        customer_id:        customer_id || null,
        vehicle_id:         vehicle_id  || null,
        assigned_technician: techId,
        job_date:           date,
        labor_description,
        labor_cost:         labor_cost ?? 0,
        notes,
        mileage_in:         mileage_in  || null,
        customer_complaint,
        service_type:       svcType,
        status:             initialStatus,
      })
      .select().single()
    if (error) throw error
    res.status(201).json(addId(data))
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const {
      labor_description, labor_cost, notes,
      assigned_technician, technician_id,
      mileage_in, customer_complaint, service_type,
    } = req.body
    const techId = assigned_technician ?? technician_id ?? null
    const { data, error } = await supabase
      .from('service_jobs')
      .update({
        labor_description, labor_cost, notes,
        assigned_technician: techId,
        mileage_in,
        customer_complaint,
        service_type,
      })
      .eq('job_id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

const VALID_STATUSES = ['estimate', 'open', 'in_progress', 'waiting_for_parts', 'completed', 'invoiced', 'paid']
const VALID_PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'cheque']

exports.setStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
    }
    const { data, error } = await supabase
      .from('service_jobs')
      .update({ status })
      .eq('job_id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.recordPayment = async (req, res, next) => {
  try {
    const { payment_method, payment_reference, amount_tendered } = req.body
    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({ error: `Invalid payment_method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` })
    }
    const { data, error } = await supabase
      .from('service_jobs')
      .update({
        payment_method,
        payment_reference: payment_reference || null,
        amount_tendered:   payment_method === 'cash' ? (amount_tendered ?? null) : null,
        payment_date:      new Date().toISOString(),
        status:            'paid',
      })
      .eq('job_id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.addItem = async (req, res, next) => {
  try {
    const { inventory_id, product_id, qty_used, unit_price } = req.body
    await stockService.decrementStock(inventory_id, qty_used)

    const { data, error } = await supabase
      .from('service_job_items')
      .insert({ job_id: req.params.id, inventory_id, product_id, qty_used, unit_price })
      .select().single()
    if (error) throw error
    res.status(201).json({ ...data, id: data.job_item_id })
  } catch (err) { next(err) }
}

exports.removeItem = async (req, res, next) => {
  try {
    const { data: item } = await supabase
      .from('service_job_items').select('inventory_id, qty_used').eq('job_item_id', req.params.itemId).single()

    await stockService.incrementStock(item.inventory_id, item.qty_used)

    const { error } = await supabase.from('service_job_items').delete().eq('job_item_id', req.params.itemId)
    if (error) throw error
    res.status(204).end()
  } catch (err) { next(err) }
}

// Kept for backward compatibility — delegates to setStatus logic
exports.complete = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('service_jobs').update({ status: 'completed' }).eq('job_id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { next(err) }
}
