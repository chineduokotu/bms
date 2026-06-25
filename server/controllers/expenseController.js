const Expense = require('../models/Expense');

exports.getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, category } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (category) filter.category = category;

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name')
      .sort('-date')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Expense.countDocuments(filter);
    res.json({ expenses, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('paidBy', 'name');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ expense });
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, paidBy: req.user._id });
    const populated = await Expense.findById(expense._id).populate('paidBy', 'name');
    res.status(201).json({ expense: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ expense });
  } catch (err) {
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};
