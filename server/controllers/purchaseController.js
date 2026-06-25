const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

exports.getPurchases = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, supplier } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (supplier) filter.supplier = supplier;

    const purchases = await Purchase.find(filter)
      .populate('receivedBy', 'name')
      .populate('supplier', 'name')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Purchase.countDocuments(filter);
    res.json({ purchases, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('receivedBy', 'name')
      .populate('supplier', 'name');
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json({ purchase });
  } catch (err) {
    next(err);
  }
};

exports.createPurchase = async (req, res, next) => {
  try {
    const { supplier, supplierName, items, amountPaid, paymentStatus } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item required' });
    }

    const purchaseItems = [];
    let totalCost = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(400).json({ message: `Product not found` });
      const costPrice = item.costPrice || product.costPrice;
      const subtotal = costPrice * item.qty;
      purchaseItems.push({
        product: product._id,
        productName: product.name,
        qty: item.qty,
        costPrice,
        subtotal,
      });
      totalCost += subtotal;
    }

    const balance = totalCost - (amountPaid || 0);

    const purchase = await Purchase.create({
      supplier: supplier || null,
      supplierName: supplierName || '',
      items: purchaseItems,
      totalCost,
      amountPaid: amountPaid || 0,
      balance: balance > 0 ? balance : 0,
      paymentStatus: balance <= 0 ? 'paid' : paymentStatus || (amountPaid > 0 ? 'partial' : 'unpaid'),
      receivedBy: req.user._id,
    });

    for (const item of purchaseItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.qty } });
    }

    if (supplier && balance > 0) {
      await Supplier.findByIdAndUpdate(supplier, { $inc: { outstandingBalance: balance } });
    }

    const populated = await Purchase.findById(purchase._id)
      .populate('receivedBy', 'name')
      .populate('supplier', 'name');
    res.status(201).json({ purchase: populated });
  } catch (err) {
    next(err);
  }
};
