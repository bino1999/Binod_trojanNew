const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/adjustmentsController')

router.get('/',    roleGuard('admin', 'manager', 'warehouse'), c.list)
router.get('/:id', roleGuard('admin', 'manager', 'warehouse'), c.get)
router.post('/',   roleGuard('admin', 'manager', 'warehouse'), c.create)

module.exports = router
