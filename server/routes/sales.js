const router = require('express').Router();
const { getSales, getSale, createSale, refundSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getSales).post(createSale);
router.get('/:id', getSale);
router.post('/:id/refund', refundSale);

module.exports = router;
