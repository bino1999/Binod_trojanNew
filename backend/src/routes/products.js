const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/productsController')

router.get('/',         c.list)
router.get('/:id',      c.get)
router.post('/',        roleGuard('admin', 'manager', 'warehouse'), c.create)
router.put('/:id',      roleGuard('admin', 'manager', 'warehouse'), c.update)
router.delete('/:id',   roleGuard('admin', 'manager'), c.deactivate)

module.exports = router
