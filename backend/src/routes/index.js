const router = require('express').Router()
const auth = require('../middleware/auth')

router.use('/auth', require('./auth'))

router.use(auth)

router.use('/products',      require('./products'))
router.use('/suppliers',     require('./suppliers'))
router.use('/inventory',     require('./inventory'))
router.use('/purchases',     require('./purchases'))
router.use('/customers',     require('./customers'))
router.use('/vehicles',      require('./vehicles'))
router.use('/internal-use',  require('./internalUse'))
router.use('/service-jobs',  require('./serviceJobs'))
router.use('/sales',         require('./sales'))
router.use('/returns',       require('./returns'))
router.use('/adjustments',   require('./adjustments'))
router.use('/reports',       require('./reports'))
router.use('/users',         require('./users'))

module.exports = router
