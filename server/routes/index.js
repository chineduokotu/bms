const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/categories', require('./categories'));
router.use('/products', require('./products'));
router.use('/sales', require('./sales'));
router.use('/customers', require('./customers'));
router.use('/suppliers', require('./suppliers'));
router.use('/purchases', require('./purchases'));
router.use('/expenses', require('./expenses'));
router.use('/reports', require('./reports'));

module.exports = router;
