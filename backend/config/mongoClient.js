const dns = require('dns');
const { MongoClient } = require('mongodb');
const env = require('./env');
const logger = require('../utils/logger');

// Configure reliable DNS servers to resolve MongoDB SRV records (fixes querySrv ECONNREFUSED on Windows/local DNS)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (err) {
  // Ignore if DNS server configuration fails in the environment
}

let client = null;
let db = null;

async function connectMongo() {
  if (db) return db;

  env.assertMongoConfigured();

  const dbName = process.env.DB_NAME || env.MONGODB_DB_NAME || 'Hospital_ERP_DB';
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db(dbName);

  await ensureIndexes(db);
  logger.info(`Connected to MongoDB database: ${dbName}`);
  return db;
}

async function getDb() {
  if (!db) {
    await connectMongo();
  }
  return db;
}

async function getCollection(name) {
  const database = await getDb();
  return database.collection(name);
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
}

/** Create indexes used by domain queries and ID generation. */
async function ensureIndexes(database) {
  // Clean up obsolete single-field unique indexes on settings collection if present
  try {
    const settingsCol = database.collection('settings');
    const existingIndexes = await settingsCol.indexes();
    for (const idx of existingIndexes) {
      if (idx.name === 'id_1' || idx.name === 'key_1') {
        await settingsCol.dropIndex(idx.name);
        logger.info(`Dropped obsolete single-field index ${idx.name} on settings collection`);
      }
    }
  } catch (err) {
    // Ignore error if index doesn't exist or collection is empty
  }

  const collections = [
    'users', 'categories', 'brands', 'units', 'products', 'product_price_history',
    'stock_transactions', 'customers', 'customer_transactions', 'suppliers',
    'supplier_transactions', 'sales', 'sale_items', 'sale_returns', 'sale_return_items',
    'purchases', 'purchase_items', 'purchase_returns', 'purchase_return_items',
    'challans', 'challan_items', 'payments', 'expenses', 'employees', 'salaries',
    'patients', 'diagnostic_tests', 'diagnostic_orders', 'diagnostic_results'
  ];

  for (const name of collections) {
    await database.collection(name).createIndex({ id: 1 }, { unique: true });
  }

  const indexSpecs = [
    { collection: 'users', indexes: [{ key: { tenantId: 1, email: 1 }, unique: true, sparse: true }] },
    { collection: 'products', indexes: [{ key: { tenantId: 1, sku: 1 }, sparse: true }] },
    { collection: 'stock_transactions', indexes: [{ key: { productId: 1 } }] },
    { collection: 'customer_transactions', indexes: [{ key: { customerId: 1 } }] },
    { collection: 'supplier_transactions', indexes: [{ key: { supplierId: 1 } }] },
    { collection: 'sales', indexes: [{ key: { customerId: 1 } }] },
    { collection: 'sale_items', indexes: [{ key: { saleId: 1 } }] },
    { collection: 'sale_returns', indexes: [{ key: { saleId: 1 } }] },
    { collection: 'sale_return_items', indexes: [{ key: { saleReturnId: 1 } }] },
    { collection: 'purchases', indexes: [{ key: { supplierId: 1 } }] },
    { collection: 'purchase_items', indexes: [{ key: { purchaseId: 1 } }] },
    { collection: 'purchase_returns', indexes: [{ key: { purchaseId: 1 } }] },
    { collection: 'purchase_return_items', indexes: [{ key: { purchaseReturnId: 1 } }] },
    { collection: 'challans', indexes: [{ key: { saleId: 1 } }] },
    { collection: 'challan_items', indexes: [{ key: { challanId: 1 } }] },
    { collection: 'product_price_history', indexes: [{ key: { productId: 1 } }] },
    { collection: 'salaries', indexes: [{ key: { employeeId: 1, payMonth: 1 } }] },
    { collection: 'patients', indexes: [{ key: { tenantId: 1, uhid: 1 }, unique: true }, { key: { tenantId: 1, phone: 1 } }] },
    { collection: 'diagnostic_tests', indexes: [{ key: { tenantId: 1, code: 1 }, unique: true }, { key: { tenantId: 1, department: 1 } }] },
    { collection: 'diagnostic_orders', indexes: [
        { key: { tenantId: 1, invoiceNumber: 1 }, unique: true },
        { key: { tenantId: 1, orderBarcode: 1 } },
        { key: { tenantId: 1, uhid: 1 } },
        { key: { tenantId: 1, "financials.paymentStatus": 1 } }
      ]
    },
    { collection: 'diagnostic_results', indexes: [
        { key: { tenantId: 1, orderId: 1, testId: 1 }, sparse: true },
        { key: { tenantId: 1, specimenBarcode: 1 }, sparse: true },
        { key: { tenantId: 1, department: 1, status: 1 } }
      ]
    },
    { collection: 'settings', indexes: [
        { key: { tenantId: 1, key: 1 }, unique: true },
        { key: { tenantId: 1, id: 1 }, unique: true }
      ]
    }
  ];

  for (const { collection, indexes } of indexSpecs) {
    const col = database.collection(collection);
    for (const spec of indexes) {
      const { key, ...options } = spec;
      try {
        await col.createIndex(key, options);
      } catch (idxErr) {
        if (idxErr.code === 86 || idxErr.codeName === 'IndexKeySpecsConflict') {
          const indexName = Object.keys(key).map((k) => `${k}_${key[k]}`).join('_');
          try {
            await col.dropIndex(indexName);
            await col.createIndex(key, options);
          } catch (dropErr) {
            logger.warn(`Could not recreate index ${indexName} on ${collection}: ${dropErr.message}`);
          }
        }
      }
    }
  }
}

module.exports = { connectMongo, getDb, getCollection, closeMongo };
