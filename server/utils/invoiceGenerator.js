const Counter = require('../models/Counter');

async function generateInvoiceNumber() {
  const counter = await Counter.findOneAndUpdate(
    { name: 'invoiceNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const year = new Date().getFullYear();
  return `INV-${year}-${String(counter.seq).padStart(5, '0')}`;
}

module.exports = { generateInvoiceNumber };
