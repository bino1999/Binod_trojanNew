const supabase = require('../config/supabase')
const stockService = require('../services/stockService')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.internal_use_id }))
  return { ...data, id: data.internal_use_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('internal_use_records')
      .select('*, products(name), inventory(qty_in_stock)')
      .order('date_used', { ascending: false })
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('internal_use_records')
      .select('*, products(*), inventory(*)')
      .eq('internal_use_id', req.params.id)
      .single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { inventory_id, product_id, qty_used, purpose, date_used, notes } = req.body
    await stockService.decrementStock(inventory_id, qty_used)

    const { data, error } = await supabase
      .from('internal_use_records')
      .insert({ inventory_id, product_id, qty_used, purpose, used_by: req.user.id, date_used, notes })
      .select().single()
    if (error) throw error
    res.status(201).json(addId(data))
  } catch (err) { next(err) }
}
