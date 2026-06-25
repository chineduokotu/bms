const router = require('express').Router();
const { getPurchases, getPurchase, createPurchase } = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getPurchases).post(createPurchase);
router.get('/:id', getPurchase);

module.exports = router;
