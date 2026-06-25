const router = require('express').Router();
const multer = require('multer');
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, bulkImport, lowStock } = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get('/low-stock', lowStock);
router.post('/bulk-import', authorize('admin', 'manager'), upload.single('file'), bulkImport);
router.route('/').get(getProducts).post(authorize('admin', 'manager'), createProduct);
router.route('/:id').get(getProduct).put(authorize('admin', 'manager'), updateProduct).delete(authorize('admin'), deleteProduct);

module.exports = router;
