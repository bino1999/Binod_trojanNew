const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/purchasesController')

router.get('/',              roleGuard('admin', 'manager', 'warehouse'), c.list)
router.get('/:id',           roleGuard('admin', 'manager', 'warehouse'), c.get)
router.post('/',             roleGuard('admin', 'manager', 'warehouse'), c.create)
router.post('/complete',     roleGuard('admin', 'manager', 'warehouse'), c.complete)
router.put('/:id',           roleGuard('admin', 'manager', 'warehouse'), c.update)
router.post('/:id/receive',  roleGuard('admin', 'manager', 'warehouse'), c.receive)
router.post('/:id/cancel',   roleGuard('admin', 'manager'), c.cancel)

module.exports = router
