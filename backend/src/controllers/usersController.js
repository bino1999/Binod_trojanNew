const supabase = require('../config/supabase')

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.invite = async (req, res, next) => {
  try {
    const { email, role } = req.body
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)
    if (error) throw error

    await supabase.from('user_profiles').insert({ user_id: data.user.id, role, email })
    res.status(201).json({ success: true })
  } catch (err) { next(err) }
}

exports.updateRole = async (req, res, next) => {
  try {
    const { role } = req.body
    const { error } = await supabase
      .from('user_profiles').update({ role }).eq('user_id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { next(err) }
}

exports.deactivate = async (req, res, next) => {
  try {
    const { error } = await supabase.auth.admin.deleteUser(req.params.id)
    if (error) throw error
    res.status(204).end()
  } catch (err) { next(err) }
}
