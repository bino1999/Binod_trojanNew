const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/internalUseController')

router.get('/',    roleGuard('admin', 'manager', 'warehouse', 'technician'), c.list)
router.get('/:id', roleGuard('admin', 'manager', 'warehouse', 'technician'), c.get)
router.post('/',   roleGuard('admin', 'manager', 'warehouse', 'technician'), c.create)

module.exports = router
