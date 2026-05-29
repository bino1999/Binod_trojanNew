const supabase = require('../config/supabase')
const stockService = require('../services/stockService')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.adjustment_id }))
  return { ...data, id: data.adjustment_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('*, products(name), inventory(qty_in_stock)')
      .order('date_adjusted', { ascending: false })
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('*, products(*), inventory(*)')
      .eq('adjustment_id', req.params.id)
      .single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { inventory_id, product_id, qty_adjusted, reason, notes, date_adjusted } = req.body

    if (reason === 'other' && !notes?.trim()) {
      return res.status(400).json({ error: 'Notes are required when reason is "other"' })
    }

    await stockService.adjustStock(inventory_id, qty_adjusted)

    const { data, error } = await supabase
      .from('stock_adjustments')
      .insert({ inventory_id, product_id, qty_adjusted, reason, notes, date_adjusted, adjusted_by: req.user.id })
      .select().single()
    if (error) throw error
    res.status(201).json(addId(data))
  } catch (err) { next(err) }
}
