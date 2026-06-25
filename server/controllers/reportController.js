const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const { exportToCSV } = require('../utils/csvExporter');

exports.dashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todaySales,
      weekSales,
      monthSales,
      todayExpenses,
      monthExpenses,
      lowStockCount,
      topProducts,
      salesTrend,
      recentSales,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfDay }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfWeek }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Product.countDocuments({
        isActive: true,
        $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
      }),
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productName', totalQty: { $sum: '$items.qty' }, revenue: { $sum: '$items.subtotal' } } },
        { $sort: { totalQty: -1 } },
        { $limit: 5 },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }, status: 'completed' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.find({ status: 'completed' })
        .populate('soldBy', 'name')
        .sort('-createdAt')
        .limit(10)
        .lean(),
    ]);

    res.json({
      todaySales: todaySales[0]?.total || 0,
      todaySalesCount: todaySales[0]?.count || 0,
      weekSales: weekSales[0]?.total || 0,
      monthSales: monthSales[0]?.total || 0,
      todayExpenses: todayExpenses[0]?.total || 0,
      monthExpenses: monthExpenses[0]?.total || 0,
      profitLoss: (monthSales[0]?.total || 0) - (monthExpenses[0]?.total || 0),
      lowStockCount,
      topProducts,
      salesTrend,
      recentSales,
    });
  } catch (err) {
    next(err);
  }
};

exports.salesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, export: exp } = req.query;
    const filter = { status: 'completed' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(filter).populate('soldBy', 'name').sort('-createdAt').lean();
    const totals = await Sale.aggregate([
      { $match: filter },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalDiscount: { $sum: '$discount' }, count: { $sum: 1 } } },
    ]);

    if (exp === 'csv') {
      const fields = ['invoiceNumber', 'totalAmount', 'discount', 'paymentMethod', 'status', 'createdAt'];
      const csv = exportToCSV(sales, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
      return res.send(csv);
    }

    res.json({
      sales,
      summary: totals[0] || { totalRevenue: 0, totalDiscount: 0, count: 0 },
    });
  } catch (err) {
    next(err);
  }
};

exports.inventoryReport = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).populate('category', 'name').lean();
    const stockValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
    const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold);

    const { export: exp } = req.query;
    if (exp === 'csv') {
      const fields = ['name', 'sku', 'quantity', 'costPrice', 'sellingPrice', 'category.name'];
      const csv = exportToCSV(products, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.csv');
      return res.send(csv);
    }

    res.json({ products, stockValue, lowStockCount: lowStock.length, totalProducts: products.length });
  } catch (err) {
    next(err);
  }
};

exports.profitLoss = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const expenseDateFilter = {};
    if (startDate || endDate) {
      expenseDateFilter.date = {};
      if (startDate) expenseDateFilter.date.$gte = new Date(startDate);
      if (endDate) expenseDateFilter.date.$lte = new Date(endDate);
    }

    const [revenueResult, cogsResult, expensesResult] = await Promise.all([
      Sale.aggregate([
        { $match: { ...dateFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Sale.aggregate([
        { $match: { ...dateFilter, status: 'completed' } },
        { $unwind: '$items' },
        {
          $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' },
        },
        { $unwind: '$product' },
        { $group: { _id: null, total: { $sum: { $multiply: ['$items.qty', '$product.costPrice'] } } } },
      ]),
      Expense.aggregate([
        { $match: expenseDateFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const revenue = revenueResult[0]?.total || 0;
    const cogs = cogsResult[0]?.total || 0;
    const expenses = expensesResult[0]?.total || 0;
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    res.json({ revenue, cogs, grossProfit, expenses, netProfit });
  } catch (err) {
    next(err);
  }
};

exports.expenseReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const byCategory = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const total = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({ byCategory, total: total[0]?.total || 0 });
  } catch (err) {
    next(err);
  }
};

exports.customerReport = async (req, res, next) => {
  try {
    const customers = await Customer.find().sort('-totalPurchases').limit(20).lean();
    res.json({ customers });
  } catch (err) {
    next(err);
  }
};
