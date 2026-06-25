const router = require('express').Router();
const { login, logout, refresh, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refresh);
router.get('/me', protect, me);

module.exports = router;
