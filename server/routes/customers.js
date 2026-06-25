const router = require('express').Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, recordPayment } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getCustomers).post(createCustomer);
router.route('/:id').get(getCustomer).put(updateCustomer);
router.post('/:id/payment', recordPayment);

module.exports = router;
