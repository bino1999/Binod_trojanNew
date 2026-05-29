const supabase = require('../config/supabase')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.product_id }))
  return { ...data, id: data.product_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', req.params.id)
      .single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { name, sku, category, unit, cost_price, selling_price, reorder_level, description } = req.body
    const { data, error } = await supabase
      .from('products')
      .insert({ name, sku, category, unit, cost_price, selling_price, reorder_level, description })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(addId(data))
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const { name, sku, category, unit, cost_price, selling_price, reorder_level, description } = req.body
    const { data, error } = await supabase
      .from('products')
      .update({ name, sku, category, unit, cost_price, selling_price, reorder_level, description })
      .eq('product_id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.deactivate = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('product_id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (err) { next(err) }
}
