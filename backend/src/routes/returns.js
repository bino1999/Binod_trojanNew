const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/returnsController')

router.get('/',    roleGuard('admin', 'manager', 'cashier'), c.list)
router.get('/:id', roleGuard('admin', 'manager', 'cashier'), c.get)
router.post('/',   roleGuard('admin', 'manager', 'cashier'), c.create)

module.exports = router
