require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const connectDB = require('./config/db');

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: 'admin@example.com' });
  if (existing) {
    console.log('Seed data already exists, skipping.');
    process.exit(0);
  }

  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'admin123', role: 'admin' });
  const manager = await User.create({ name: 'Manager', email: 'manager@example.com', password: 'manager123', role: 'manager' });
  const cashier = await User.create({ name: 'Cashier', email: 'cashier@example.com', password: 'cashier123', role: 'cashier' });

  const electronics = await Category.create({ name: 'Electronics', description: 'Electronic items' });
  const groceries = await Category.create({ name: 'Groceries', description: 'Food and groceries' });
  const clothing = await Category.create({ name: 'Clothing', description: 'Apparel and accessories' });

  await Product.insertMany([
    { name: 'Wireless Mouse', sku: 'WM-001', category: electronics._id, costPrice: 1500, sellingPrice: 2500, quantity: 50, lowStockThreshold: 5, unit: 'pcs' },
    { name: 'USB-C Hub', sku: 'USB-002', category: electronics._id, costPrice: 3000, sellingPrice: 5500, quantity: 30, lowStockThreshold: 5, unit: 'pcs' },
    { name: 'Bluetooth Speaker', sku: 'BT-003', category: electronics._id, costPrice: 5000, sellingPrice: 8500, quantity: 20, lowStockThreshold: 3, unit: 'pcs' },
    { name: 'LED Desk Lamp', sku: 'LED-004', category: electronics._id, costPrice: 2000, sellingPrice: 3800, quantity: 15, lowStockThreshold: 5, unit: 'pcs' },
    { name: 'Organic Rice 5kg', sku: 'RICE-005', category: groceries._id, costPrice: 2500, sellingPrice: 4000, quantity: 100, lowStockThreshold: 20, unit: 'kg' },
    { name: 'Cooking Oil 3L', sku: 'OIL-006', category: groceries._id, costPrice: 3500, sellingPrice: 5200, quantity: 60, lowStockThreshold: 10, unit: 'litres' },
    { name: 'Sugar 1kg', sku: 'SUG-007', category: groceries._id, costPrice: 800, sellingPrice: 1500, quantity: 80, lowStockThreshold: 20, unit: 'kg' },
    { name: 'Wheat Flour 2kg', sku: 'FLR-008', category: groceries._id, costPrice: 1200, sellingPrice: 2200, quantity: 2, lowStockThreshold: 10, unit: 'kg' },
    { name: 'T-Shirt (Cotton)', sku: 'TS-009', category: clothing._id, costPrice: 1800, sellingPrice: 3500, quantity: 40, lowStockThreshold: 10, unit: 'pcs' },
    { name: 'Denim Jeans', sku: 'DJ-010', category: clothing._id, costPrice: 5000, sellingPrice: 9500, quantity: 4, lowStockThreshold: 5, unit: 'pcs' },
  ]);

  console.log('Seed data created!');
  console.log('Admin: admin@example.com / admin123');
  console.log('Manager: manager@example.com / manager123');
  console.log('Cashier: cashier@example.com / cashier123');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
