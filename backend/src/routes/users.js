const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/usersController')

router.get('/',        roleGuard('admin'), c.list)
router.post('/invite', roleGuard('admin'), c.invite)
router.put('/:id',     roleGuard('admin'), c.updateRole)
router.delete('/:id',  roleGuard('admin'), c.deactivate)

module.exports = router
