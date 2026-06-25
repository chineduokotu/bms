const router = require('express').Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.route('/').get(getCategories).post(authorize('admin', 'manager'), createCategory);
router.route('/:id').put(authorize('admin', 'manager'), updateCategory).delete(authorize('admin'), deleteCategory);

module.exports = router;
