const supabase = require('../config/supabase')
const stockService = require('../services/stockService')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.return_id }))
  return { ...data, id: data.return_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('returns')
      .select('*, customers(name)')
      .order('return_date', { ascending: false })
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('returns')
      .select('*, customers(*), return_items(*, products(*), inventory(*))')
      .eq('return_id', req.params.id)
      .single()
    if (error) throw error
    const result = {
      ...data,
      id: data.return_id,
      return_items: (data.return_items ?? []).map(i => ({ ...i, id: i.return_item_id })),
    }
    res.json(result)
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { source_type, source_id, customer_id, return_date, reason, items } = req.body

    const total_refund_amount = items.reduce((sum, i) => sum + (i.qty_returned * i.unit_price), 0)

    const { data: ret, error: retErr } = await supabase
      .from('returns')
      .insert({ source_type, source_id, customer_id: customer_id || null, return_date, reason, total_refund_amount, processed_by: req.user.id })
      .select().single()
    if (retErr) throw retErr

    const returnItems = items.map((i) => ({
      return_id: ret.return_id,
      inventory_id: i.inventory_id,
      product_id: i.product_id,
      qty_returned: i.qty_returned,
      unit_price: i.unit_price,
    }))
    const { error: itemErr } = await supabase.from('return_items').insert(returnItems)
    if (itemErr) throw itemErr

    await Promise.all(items.map((i) => stockService.incrementStock(i.inventory_id, i.qty_returned)))

    res.status(201).json(addId(ret))
  } catch (err) { next(err) }
}
