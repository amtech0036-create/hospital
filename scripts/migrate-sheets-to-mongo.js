#!/usr/bin/env node
/**
 * One-time migration: copy all data from Google Sheets into MongoDB Atlas.
 *
 * Prerequisites:
 *   - Google Sheets env vars still configured (source)
 *   - MONGODB_URI and MONGODB_DB_NAME set (destination)
 *
 * Usage:
 *   node scripts/migrate-sheets-to-mongo.js
 *
 * Safe to re-run: existing documents with the same id are skipped (upsert).
 */
require('dotenv').config();

const dns = require('dns');
const { MongoClient } = require('mongodb');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (err) {}

const SHEET_TO_COLLECTION = [
  { repoKey: 'userRepository', collection: 'users' },
  { repoKey: 'categoryRepository', collection: 'categories' },
  { repoKey: 'brandRepository', collection: 'brands' },
  { repoKey: 'unitRepository', collection: 'units' },
  { repoKey: 'productRepository', collection: 'products' },
  { repoKey: 'productPriceHistoryRepository', collection: 'product_price_history' },
  { repoKey: 'stockTransactionRepository', collection: 'stock_transactions' },
  { repoKey: 'customerRepository', collection: 'customers' },
  { repoKey: 'customerTransactionRepository', collection: 'customer_transactions' },
  { repoKey: 'supplierRepository', collection: 'suppliers' },
  { repoKey: 'supplierTransactionRepository', collection: 'supplier_transactions' },
  { repoKey: 'saleRepository', collection: 'sales' },
  { repoKey: 'saleItemRepository', collection: 'sale_items' },
  { repoKey: 'saleReturnRepository', collection: 'sale_returns' },
  { repoKey: 'saleReturnItemRepository', collection: 'sale_return_items' },
  { repoKey: 'purchaseRepository', collection: 'purchases' },
  { repoKey: 'purchaseItemRepository', collection: 'purchase_items' },
  { repoKey: 'purchaseReturnRepository', collection: 'purchase_returns' },
  { repoKey: 'purchaseReturnItemRepository', collection: 'purchase_return_items' },
  { repoKey: 'challanRepository', collection: 'challans' },
  { repoKey: 'challanItemRepository', collection: 'challan_items' },
  { repoKey: 'paymentRepository', collection: 'payments' },
  { repoKey: 'expenseRepository', collection: 'expenses' },
  { repoKey: 'employeeRepository', collection: 'employees' },
  { repoKey: 'salaryRepository', collection: 'salaries' },
  { repoKey: 'settingsRepository', collection: 'settings' }
];

async function loadGoogleSheetsRepos() {
  process.env.DB_DRIVER = 'googlesheets';
  delete require.cache[require.resolve('../backend/config/env')];
  delete require.cache[require.resolve('../backend/repositories/index')];

  const env = require('../backend/config/env');
  env.assertGoogleSheetsConfigured();

  return require('../backend/repositories/index');
}

async function migrate() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'inventory_erp';

  if (!uri) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }

  console.log('Loading data from Google Sheets...');
  const sheetRepos = await loadGoogleSheetsRepos();

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log(`Connected to MongoDB: ${dbName}\n`);

  let totalMigrated = 0;

  for (const { repoKey, collection } of SHEET_TO_COLLECTION) {
    const repo = sheetRepos[repoKey];
    const records = await repo.findAll();
    const col = db.collection(collection);

    if (records.length === 0) {
      console.log(`  ${collection}: 0 records (skipped)`);
      continue;
    }

    let inserted = 0;
    let updated = 0;

    for (const record of records) {
      const id = record.id;
      if (!id) continue;

      const result = await col.replaceOne({ id }, record, { upsert: true });
      if (result.upsertedCount) inserted += 1;
      else if (result.modifiedCount) updated += 1;
    }

    totalMigrated += records.length;
    console.log(`  ${collection}: ${records.length} records (${inserted} new, ${updated} updated)`);
  }

  await client.close();
  console.log(`\nMigration complete. ${totalMigrated} total records processed.`);
  console.log('Next step: set DB_DRIVER=mongo in .env and restart the server.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
