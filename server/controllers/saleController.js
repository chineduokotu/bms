const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { generateInvoiceNumber } = require('../utils/invoiceGenerator');

exports.getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (status) filter.status = status;

    const sales = await Sale.find(filter)
      .populate('soldBy', 'name')
      .populate('customer', 'name phone')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Sale.countDocuments(filter);
    res.json({ sales, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('soldBy', 'name')
      .populate('customer', 'name phone email');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json({ sale });
  } catch (err) {
    next(err);
  }
};

exports.createSale = async (req, res, next) => {
  try {
    const { items, customer, customerName, discount, amountPaid, paymentMethod, status } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item required' });
    }

    const saleItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }
      if (product.quantity < item.qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
        });
      }
      const unitPrice = item.unitPrice || product.sellingPrice;
      const subtotal = unitPrice * item.qty;
      saleItems.push({
        product: product._id,
        productName: product.name,
        qty: item.qty,
        unitPrice,
        subtotal,
      });
      totalAmount += subtotal;
    }

    totalAmount -= discount || 0;
    if (totalAmount < 0) return res.status(400).json({ message: 'Discount exceeds total' });

    const invoiceNumber = await generateInvoiceNumber();

    const sale = await Sale.create({
      invoiceNumber,
      items: saleItems,
      customer: customer || null,
      customerName: customerName || '',
      totalAmount,
      discount: discount || 0,
      amountPaid: amountPaid || 0,
      change: Math.max(0, (amountPaid || 0) - totalAmount),
      paymentMethod: paymentMethod || 'cash',
      status: status || 'completed',
      soldBy: req.user._id,
    });

    for (const item of saleItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.qty } });
    }

    if (customer) {
      await Customer.findByIdAndUpdate(customer, {
        $inc: { totalPurchases: totalAmount, outstandingBalance: totalAmount - (amountPaid || 0) },
      });
    }

    const populated = await Sale.findById(sale._id)
      .populate('soldBy', 'name')
      .populate('customer', 'name phone');
    res.status(201).json({ sale: populated });
  } catch (err) {
    next(err);
  }
};

exports.refundSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.status === 'refunded') return res.status(400).json({ message: 'Already refunded' });

    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.qty } });
    }

    sale.status = 'refunded';
    await sale.save();

    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: { totalPurchases: -sale.totalAmount, outstandingBalance: -(sale.totalAmount - sale.amountPaid) },
      });
    }

    res.json({ sale });
  } catch (err) {
    next(err);
  }
};
