const Product = require('../models/Product');
const { parse } = require('csv-parse/sync');

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, sortBy, order } = req.query;
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    const sortObj = {};
    if (sortBy) sortObj[sortBy] = order === 'desc' ? -1 : 1;
    else sortObj.createdAt = -1;

    const products = await Product.find(filter)
      .populate('category', 'name')
      .sort(sortObj)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Product.countDocuments(filter);
    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

exports.bulkImport = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file required' });
    const records = parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true });
    const products = await Product.insertMany(records);
    res.status(201).json({ products, count: products.length });
  } catch (err) {
    next(err);
  }
};

exports.lowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    }).populate('category', 'name');
    res.json({ products, count: products.length });
  } catch (err) {
    next(err);
  }
};
