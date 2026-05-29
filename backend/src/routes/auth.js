const router = require('express').Router()
const { createClient } = require('@supabase/supabase-js')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Use a fresh client for sign-in so the shared service-role client's
    // session is never overwritten (signInWithPassword sets in-memory session,
    // which would cause subsequent DB queries to run as the user and be
    // blocked by RLS instead of using the service role key).
    const signInClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await signInClient.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: error.message })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .single()

    if (!profile?.role) {
      // First-run: if no profiles exist at all, auto-create this user as admin
      const { count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      if (count === 0) {
        await supabase.from('user_profiles').insert({
          user_id: data.user.id,
          email: data.user.email,
          role: 'admin',
        })
        return res.json({
          user: { id: data.user.id, email: data.user.email },
          token: data.session.access_token,
          role: 'admin',
        })
      }

      return res.status(403).json({
        error: 'Your account has no role assigned. Ask an admin to invite you through the Users page.',
      })
    }

    res.json({
      user: { id: data.user.id, email: data.user.email },
      token: data.session.access_token,
      role: profile.role,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me', auth, async (req, res, next) => {
  try {
    res.json({ id: req.user.id, email: req.user.email, role: req.role })
  } catch (err) {
    next(err)
  }
})

module.exports = router
