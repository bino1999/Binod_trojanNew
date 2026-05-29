const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/suppliersController')

router.get('/',                     roleGuard('admin', 'manager', 'warehouse'), c.list)
router.get('/:id',                  roleGuard('admin', 'manager', 'warehouse'), c.get)
router.post('/',                    roleGuard('admin', 'manager', 'warehouse'), c.create)
router.put('/:id',                  roleGuard('admin', 'manager', 'warehouse'), c.update)
router.delete('/:id',               roleGuard('admin', 'manager'), c.deactivate)
router.get('/:id/products',         roleGuard('admin', 'manager', 'warehouse'), c.listProducts)
router.post('/:id/products',        roleGuard('admin', 'manager', 'warehouse'), c.linkProduct)
router.delete('/:id/products/:pid', roleGuard('admin', 'manager'), c.unlinkProduct)

module.exports = router
