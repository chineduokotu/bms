const router = require('express').Router();
const { dashboard, salesReport, inventoryReport, profitLoss, expenseReport, customerReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', dashboard);
router.get('/sales', salesReport);
router.get('/inventory', inventoryReport);
router.get('/profit-loss', profitLoss);
router.get('/expenses', expenseReport);
router.get('/customers', customerReport);

module.exports = router;
