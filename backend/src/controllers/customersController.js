const supabase = require('../config/supabase')

function addId(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(r => ({ ...r, id: r.customer_id }))
  return { ...data, id: data.customer_id }
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', req.params.id)
      .single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, phone, email, address })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(addId(data))
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body
    const { data, error } = await supabase
      .from('customers')
      .update({ name, phone, email, address })
      .eq('customer_id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(addId(data))
  } catch (err) { next(err) }
}

exports.listVehicles = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', req.params.id)
      .order('registration_number')
    if (error) throw error
    const mapped = (data ?? []).map(v => ({
      ...v,
      id: v.vehicle_id,
      registration_number: v.registration_number ?? v.plate_number,
    }))
    res.json(mapped)
  } catch (err) { next(err) }
}
