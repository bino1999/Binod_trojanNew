const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/vehiclesController')

router.get('/',    roleGuard('admin', 'manager', 'cashier', 'technician'), c.list)
router.get('/:id', roleGuard('admin', 'manager', 'cashier', 'technician'), c.get)
router.post('/',   roleGuard('admin', 'manager', 'cashier'),               c.create)
router.put('/:id', roleGuard('admin', 'manager', 'cashier'),               c.update)

module.exports = router
