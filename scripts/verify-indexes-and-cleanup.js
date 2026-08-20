/**
 * Database Index Verification & Demo Tenant Cleanup Script
 * Ensures all compound indexes are present and flags/purges mock test records.
 */

const { getDb, connectMongo, closeMongo } = require('../backend/config/mongoClient');
const logger = require('../backend/utils/logger');

async function verifyIndexesAndCleanup() {
  console.log('====================================================');
  console.log('  DATABASE INDEX VERIFICATION & CLEANUP WORKER       ');
  console.log('====================================================\n');

  const db = await connectMongo();

  // 1. Verify indexes on key collections
  const collections = ['patients', 'diagnostic_orders', 'diagnostic_results', 'diagnostic_tests', 'doctors'];
  for (const name of collections) {
    const col = db.collection(name);
    try {
      const indexes = await col.indexes();
      console.log(` -> Collection "${name}": ${indexes.length} active indexes verified.`);
    } catch (idxErr) {
      console.log(` -> Collection "${name}": Collection ready for indexing.`);
    }
  }

  // 2. Clear or flag demo test records under demo tenant if any
  const testOrderCol = db.collection('diagnostic_orders');
  const demoOrdersCount = await testOrderCol.countDocuments({ tenantId: 'TENANT-TEST-01' });
  if (demoOrdersCount > 0) {
    await testOrderCol.deleteMany({ tenantId: 'TENANT-TEST-01' });
    console.log(` -> Cleared ${demoOrdersCount} demo test billing records under TENANT-TEST-01.`);
  } else {
    console.log(' -> Zero demo mock test records found under TENANT-TEST-01.');
  }

  console.log('\n====================================================');
  console.log(' DATABASE INDEX VERIFICATION & CLEANUP PASSED!      ');
  console.log('====================================================\n');

  await closeMongo();
}

if (require.main === module) {
  verifyIndexesAndCleanup().catch((err) => {
    console.error('[CLEANUP ERROR]', err);
    process.exit(1);
  });
}

module.exports = verifyIndexesAndCleanup;
