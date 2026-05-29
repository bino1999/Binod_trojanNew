const supabase = require('../config/supabase')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.supplier_id }))
  return { ...data, id: data.supplier_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('suppliers').select('*').order('name')
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('suppliers').select('*').eq('supplier_id', req.params.id).single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { name, contact_person, phone, email, address } = req.body
    const { data, error } = await supabase
      .from('suppliers').insert({ name, contact_person, phone, email, address }).select().single()
    if (error) throw error
    res.status(201).json(addId(data))
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const { name, contact_person, phone, email, address } = req.body
    const { data, error } = await supabase
      .from('suppliers').update({ name, contact_person, phone, email, address })
      .eq('supplier_id', req.params.id).select().single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.deactivate = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('suppliers').update({ is_active: false }).eq('supplier_id', req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (err) { next(err) }
}

exports.listProducts = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('*, products(*)')
      .eq('supplier_id', req.params.id)
    if (error) throw error
    const mapped = (data ?? []).map(r => ({
      ...r,
      id: r.supplier_product_id,
      products: r.products ? { ...r.products, id: r.products.product_id } : null,
    }))
    res.json(mapped)
  } catch (err) { next(err) }
}

exports.linkProduct = async (req, res, next) => {
  try {
    const { product_id, default_company_price, notes } = req.body
    const { data, error } = await supabase
      .from('supplier_products')
      .insert({ supplier_id: req.params.id, product_id, default_company_price, notes })
      .select().single()
    if (error) throw error
    res.status(201).json({ ...data, id: data.supplier_product_id })
  } catch (err) { next(err) }
}

exports.unlinkProduct = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('supplier_products')
      .delete()
      .eq('supplier_id', req.params.id)
      .eq('product_id', req.params.pid)
    if (error) throw error
    res.status(204).end()
  } catch (err) { next(err) }
}
