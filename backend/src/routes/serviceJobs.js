const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/serviceJobsController')

router.get('/',                     roleGuard('admin', 'manager', 'technician'), c.list)
router.get('/:id',                  roleGuard('admin', 'manager', 'technician'), c.get)
router.post('/',                    roleGuard('admin', 'manager', 'technician'), c.create)
router.put('/:id',                  roleGuard('admin', 'manager', 'technician'), c.update)
router.post('/:id/items',           roleGuard('admin', 'manager', 'technician'), c.addItem)
router.delete('/:id/items/:itemId', roleGuard('admin', 'manager', 'technician'), c.removeItem)
router.put('/:id/status',           roleGuard('admin', 'manager', 'technician'), c.setStatus)
router.post('/:id/complete',        roleGuard('admin', 'manager'), c.complete)
router.post('/:id/payment',         roleGuard('admin', 'manager'), c.recordPayment)

module.exports = router
