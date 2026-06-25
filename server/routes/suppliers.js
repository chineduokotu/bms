const router = require('express').Router();
const { getSuppliers, getSupplier, createSupplier, updateSupplier } = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getSuppliers).post(createSupplier);
router.route('/:id').get(getSupplier).put(updateSupplier);

module.exports = router;
