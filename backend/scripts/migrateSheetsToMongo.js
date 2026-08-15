/**
 * One-time migration: Google Sheets -> MongoDB.
 *
 * Reads every record out of every Sheets tab (via the existing
 * googlesheets/* repositories, so it uses the exact same read logic the
 * app already trusts) and inserts it as-is into the matching MongoDB
 * collection — same field names, same IDs, same createdAt/updatedAt.
 * Nothing is regenerated, so every foreign-key-style reference
 * (customerId, productId, saleId, ...) keeps working unchanged.
 *
 * Safe to re-run: each collection is cleared before its data is
 * re-inserted, so running this twice does not create duplicates.
 *
 * Usage:
 *   1. Make sure BOTH the Google Sheets vars AND MONGODB_URI are set in .env
 *      (DB_DRIVER can be either value — this script ignores it and always
 *      reads Sheets + writes Mongo).
 *   2. node backend/scripts/migrateSheetsToMongo.js
 *   3. Review the summary it prints, spot-check a few records in Atlas.
 *   4. Only then set DB_DRIVER=mongo and redeploy.
 */
require('dotenv').config();

const env = require('../config/env');
const { connectMongo, getCollection, closeMongo } = require('../config/mongoClient');
const logger = require('../utils/logger');

// Sheet tab name (for logging) -> [SheetsRepositoryClass, mongo collection name]
const ENTITIES = [
  ['Users', require('../repositories/googlesheets/UserRepository'), 'users'],
  ['Categories', require('../repositories/googlesheets/CategoryRepository'), 'categories'],
  ['Brands', require('../repositories/googlesheets/BrandRepository'), 'brands'],
  ['Units', require('../repositories/googlesheets/UnitRepository'), 'units'],
  ['Products', require('../repositories/googlesheets/ProductRepository'), 'products'],
  ['Product_Price_History', require('../repositories/googlesheets/ProductPriceHistoryRepository'), 'product_price_history'],
  ['Stock_Transactions', require('../repositories/googlesheets/StockTransactionRepository'), 'stock_transactions'],
  ['Customers', require('../repositories/googlesheets/CustomerRepository'), 'customers'],
  ['Customer_Transactions', require('../repositories/googlesheets/CustomerTransactionRepository'), 'customer_transactions'],
  ['Suppliers', require('../repositories/googlesheets/SupplierRepository'), 'suppliers'],
  ['Supplier_Transactions', require('../repositories/googlesheets/SupplierTransactionRepository'), 'supplier_transactions'],
  ['Sales', require('../repositories/googlesheets/SaleRepository'), 'sales'],
  ['Sale_Items', require('../repositories/googlesheets/SaleItemRepository'), 'sale_items'],
  ['Sale_Returns', require('../repositories/googlesheets/SaleReturnRepository'), 'sale_returns'],
  ['Sale_Return_Items', require('../repositories/googlesheets/SaleReturnItemRepository'), 'sale_return_items'],
  ['Purchases', require('../repositories/googlesheets/PurchaseRepository'), 'purchases'],
  ['Purchase_Items', require('../repositories/googlesheets/PurchaseItemRepository'), 'purchase_items'],
  ['Purchase_Returns', require('../repositories/googlesheets/PurchaseReturnRepository'), 'purchase_returns'],
  ['Purchase_Return_Items', require('../repositories/googlesheets/PurchaseReturnItemRepository'), 'purchase_return_items'],
  ['Challans', require('../repositories/googlesheets/ChallanRepository'), 'challans'],
  ['Challan_Items', require('../repositories/googlesheets/ChallanItemRepository'), 'challan_items'],
  ['Payments', require('../repositories/googlesheets/PaymentRepository'), 'payments'],
  ['Expenses', require('../repositories/googlesheets/ExpenseRepository'), 'expenses'],
  ['Employees', require('../repositories/googlesheets/EmployeeRepository'), 'employees'],
  ['Salary', require('../repositories/googlesheets/SalaryRepository'), 'salaries'],
  ['Settings', require('../repositories/googlesheets/SettingsRepository'), 'settings']
];

async function migrateEntity(sheetName, SheetsRepoClass, collectionName) {
  const sheetsRepo = new SheetsRepoClass();

  let records;
  try {
    records = await sheetsRepo.findAll();
  } catch (err) {
    logger.warn(`Skipping "${sheetName}" — could not read from Sheets (${err.message}). Tab may not exist; that's fine if you never used this module.`);
    return { sheetName, collectionName, migrated: 0, skipped: true };
  }

  const col = await getCollection(collectionName);

  if (records.length === 0) {
    logger.info(`"${sheetName}" -> "${collectionName}": 0 records, nothing to do.`);
    return { sheetName, collectionName, migrated: 0, skipped: false };
  }

  // Re-runnable: wipe this collection's data first so re-running never duplicates.
  await col.deleteMany({});

  // Deduplicate records by id if sheet contains duplicate rows
  const seenIds = new Set();
  const uniqueRecords = [];
  for (const record of records) {
    if (record.id) {
      if (seenIds.has(record.id)) {
        logger.warn(`Skipping duplicate record id "${record.id}" in "${sheetName}"`);
        continue;
      }
      seenIds.add(record.id);
    }
    uniqueRecords.push(record);
  }

  if (uniqueRecords.length > 0) {
    await col.insertMany(uniqueRecords, { ordered: true });
  }

  logger.info(`"${sheetName}" -> "${collectionName}": migrated ${uniqueRecords.length} records.`);
  return { sheetName, collectionName, migrated: uniqueRecords.length, skipped: false };
}

async function run() {
  logger.info('Starting Google Sheets -> MongoDB migration...');
  env.assertGoogleSheetsConfigured();
  env.assertMongoConfigured();

  await connectMongo();

  const results = [];
  for (const [sheetName, RepoClass, collectionName] of ENTITIES) {
    const result = await migrateEntity(sheetName, RepoClass, collectionName);
    results.push(result);
  }

  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
  const skipped = results.filter((r) => r.skipped).map((r) => r.sheetName);

  console.log('\n========== MIGRATION SUMMARY ==========');
  results.forEach((r) => {
    console.log(`${r.sheetName.padEnd(24)} -> ${r.collectionName.padEnd(24)} : ${r.skipped ? 'SKIPPED (tab missing)' : r.migrated + ' records'}`);
  });
  console.log('----------------------------------------');
  console.log(`Total records migrated: ${totalMigrated}`);
  if (skipped.length) {
    console.log(`Tabs skipped (not found — fine if unused): ${skipped.join(', ')}`);
  }
  console.log('========================================\n');
  console.log('Next steps:');
  console.log('  1. Spot-check a few collections in MongoDB Atlas.');
  console.log('  2. Set DB_DRIVER=mongo in your .env / Render environment variables.');
  console.log('  3. Restart the server and verify the app end-to-end before removing Sheets access.');

  await closeMongo();
  process.exit(0);
}

run().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
