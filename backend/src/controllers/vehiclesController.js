const supabase = require('../config/supabase')

function mapVehicle(v) {
  if (!v) return v
  return {
    ...v,
    id: v.vehicle_id,
    registration_number: v.registration_number ?? v.plate_number,
  }
}

function mapVehicles(data) {
  if (!data) return data
  if (Array.isArray(data)) return data.map(mapVehicle)
  return mapVehicle(data)
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, customers(name)')
      .order('plate_number')
    if (error) throw error
    res.json(mapVehicles(data))
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, customers(name, phone, email)')
      .eq('vehicle_id', req.params.id)
      .single()
    if (error) throw error
    res.json(mapVehicle(data))
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { customer_id, registration_number, plate_number, make, model, year, color, mileage_in } = req.body
    const reg = registration_number ?? plate_number
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ customer_id, plate_number: reg, make, model, year, color, mileage_in })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(mapVehicle(data))
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const { registration_number, plate_number, make, model, year, color, mileage_in } = req.body
    const reg = registration_number ?? plate_number
    const { data, error } = await supabase
      .from('vehicles')
      .update({ plate_number: reg, make, model, year, color, mileage_in })
      .eq('vehicle_id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(mapVehicle(data))
  } catch (err) { next(err) }
}

exports.listByCustomer = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', req.params.id)
      .order('plate_number')
    if (error) throw error
    res.json(mapVehicles(data))
  } catch (err) { next(err) }
}
