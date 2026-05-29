const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/customersController')
const vehiclesController = require('../controllers/vehiclesController')

router.get('/',    roleGuard('admin', 'manager', 'cashier', 'technician'), c.list)
router.get('/:id', roleGuard('admin', 'manager', 'cashier', 'technician'), c.get)
router.post('/',   roleGuard('admin', 'manager', 'cashier'),               c.create)
router.put('/:id', roleGuard('admin', 'manager', 'cashier'),               c.update)

router.get('/:id/vehicles', roleGuard('admin', 'manager', 'cashier', 'technician'), vehiclesController.listByCustomer)

module.exports = router
