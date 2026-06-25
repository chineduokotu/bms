require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');

async function reset() {
  await connectDB();

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  const systemCollections = ['users'];
  const collectionsToDrop = collectionNames.filter(
    name => !['users', 'system.indexes', 'system.profile', 'system.js'].includes(name)
  );

  if (collectionsToDrop.length === 0) {
    console.log('No business data collections found. System is already clean.');
  } else {
    for (const name of collectionsToDrop) {
      await db.dropCollection(name);
      console.log(`Dropped collection: ${name}`);
    }
    console.log(`\nCleared ${collectionsToDrop.length} collection(s). All business data removed.`);
  }

  console.log('User accounts preserved: admin, manager, cashier');
  console.log('\nDone! Your business is ready for a fresh start.');
  process.exit(0);
}

reset().catch((err) => { console.error('Reset failed:', err); process.exit(1); });
