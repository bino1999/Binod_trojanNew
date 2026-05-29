const supabase = require('../config/supabase')

exports.stock = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*, products(name, category, unit), suppliers(name)')
      .order('qty_in_stock')
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.stockMovement = async (req, res, next) => {
  try {
    const { product_id, from, to } = req.query
    if (!product_id) return res.status(400).json({ error: 'product_id is required' })

    function applyDateRange(q, field) {
      if (from) q = q.gte(field, from)
      if (to)   q = q.lte(field, to)
      return q
    }

    const [purchases, sales, internalUse, serviceJobs, returns, adjustments] = await Promise.all([
      applyDateRange(
        supabase.from('purchase_order_items')
          .select('po_item_id, qty_received, purchase_orders!inner(purchase_order_id, order_date, status)')
          .eq('product_id', product_id)
          .eq('purchase_orders.status', 'received'),
        'purchase_orders.order_date'
      ),
      applyDateRange(
        supabase.from('sale_items')
          .select('sale_item_id, qty_sold, sales!inner(sale_id, sale_date)')
          .eq('product_id', product_id),
        'sales.sale_date'
      ),
      applyDateRange(
        supabase.from('internal_use_records')
          .select('internal_use_id, qty_used, date_used')
          .eq('product_id', product_id),
        'date_used'
      ),
      applyDateRange(
        supabase.from('service_job_items')
          .select('job_item_id, qty_used, service_jobs!inner(job_id, job_date)')
          .eq('product_id', product_id),
        'service_jobs.job_date'
      ),
      applyDateRange(
        supabase.from('return_items')
          .select('return_item_id, qty_returned, returns!inner(return_id, return_date)')
          .eq('product_id', product_id),
        'returns.return_date'
      ),
      applyDateRange(
        supabase.from('stock_adjustments')
          .select('adjustment_id, qty_adjusted, date_adjusted')
          .eq('product_id', product_id),
        'date_adjusted'
      ),
    ])

    for (const result of [purchases, sales, internalUse, serviceJobs, returns, adjustments]) {
      if (result.error) throw result.error
    }

    const movements = [
      ...(purchases.data || []).map(r => ({
        date:         r.purchase_orders.order_date,
        type:         'purchase',
        qty:          r.qty_received,
        reference_id: r.purchase_orders.purchase_order_id,
      })),
      ...(sales.data || []).map(r => ({
        date:         r.sales.sale_date,
        type:         'sale',
        qty:          -r.qty_sold,
        reference_id: r.sales.sale_id,
      })),
      ...(internalUse.data || []).map(r => ({
        date:         r.date_used,
        type:         'internal_use',
        qty:          -r.qty_used,
        reference_id: r.internal_use_id,
      })),
      ...(serviceJobs.data || []).map(r => ({
        date:         r.service_jobs.job_date,
        type:         'service_job',
        qty:          -r.qty_used,
        reference_id: r.service_jobs.job_id,
      })),
      ...(returns.data || []).map(r => ({
        date:         r.returns.return_date,
        type:         'return',
        qty:          r.qty_returned,
        reference_id: r.returns.return_id,
      })),
      ...(adjustments.data || []).map(r => ({
        date:         r.date_adjusted,
        type:         'adjustment',
        qty:          r.qty_adjusted,
        reference_id: r.adjustment_id,
      })),
    ]

    movements.sort((a, b) => new Date(a.date) - new Date(b.date))
    res.json(movements)
  } catch (err) { next(err) }
}

exports.supplierPurchases = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name), purchase_order_items(*)')
      .eq('status', 'received')
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.sales = async (req, res, next) => {
  try {
    const { from, to } = req.query
    let q = supabase.from('sales').select('*, sale_items(*)')
    if (from) q = q.gte('sale_date', from)
    if (to) q = q.lte('sale_date', to)
    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.serviceJobs = async (req, res, next) => {
  try {
    const { from, to } = req.query
    let q = supabase.from('service_jobs').select('*, service_job_items(*)')
    if (from) q = q.gte('job_date', from)
    if (to) q = q.lte('job_date', to)
    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.internalUse = async (req, res, next) => {
  try {
    const { from, to } = req.query
    let q = supabase.from('internal_use_records').select('*, products(name)')
    if (from) q = q.gte('date_used', from)
    if (to) q = q.lte('date_used', to)
    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.returns = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('returns').select('*, return_items(*, products(name))')
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.profitMargin = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('company_price, selling_price, products(name, category)')
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.lowStock = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*, products(name, category, unit)')
      .order('qty_in_stock')
    if (error) throw error
    // Supabase JS has no column-to-column filter — filter in JS instead
    res.json(data.filter(row => row.qty_in_stock <= row.reorder_level))
  } catch (err) { next(err) }
}
