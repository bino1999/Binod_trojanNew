const router = require('express').Router()
const roleGuard = require('../middleware/roleGuard')
const c = require('../controllers/reportsController')

router.get('/stock',          roleGuard('admin', 'manager'), c.stock)
router.get('/stock-movement', roleGuard('admin', 'manager'), c.stockMovement)
router.get('/supplier-purchases', roleGuard('admin', 'manager'), c.supplierPurchases)
router.get('/sales',          roleGuard('admin', 'manager'), c.sales)
router.get('/service-jobs',   roleGuard('admin', 'manager'), c.serviceJobs)
router.get('/internal-use',   roleGuard('admin', 'manager'), c.internalUse)
router.get('/returns',        roleGuard('admin', 'manager'), c.returns)
router.get('/profit-margin',  roleGuard('admin', 'manager'), c.profitMargin)
router.get('/low-stock',      roleGuard('admin', 'manager'), c.lowStock)

module.exports = router
