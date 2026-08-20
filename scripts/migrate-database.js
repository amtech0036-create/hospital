/**
 * Database Migration Utility
 * Copies all collections and documents from source database (inventory_erp)
 * to target database (Hospital_ERP_DB) on the MongoDB Atlas cluster.
 */

const dns = require('dns');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (err) {}

async function migrateDatabase({
  mongoUri = 'mongodb+srv://amtechsolutions0036_db_user:dfAkYgXS9aN8YCw2@cluster0.fcrqzb7.mongodb.net/',
  sourceDbName = 'inventory_erp',
  targetDbName = 'Hospital_ERP_DB'
} = {}) {
  console.log(`====================================================`);
  console.log(`   MONGODB DATABASE MIGRATION UTILITY               `);
  console.log(`====================================================`);
  console.log(`Source DB: ${sourceDbName}`);
  console.log(`Target DB: ${targetDbName}\n`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log(' -> Connected to MongoDB cluster successfully.');

    const sourceDb = client.db(sourceDbName);
    const targetDb = client.db(targetDbName);

    const collections = await sourceDb.listCollections().toArray();
    console.log(` -> Found ${collections.length} collections in ${sourceDbName}.\n`);

    let totalMigrated = 0;

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      const docs = await sourceCol.find({}).toArray();

      if (docs.length > 0) {
        // Clear old contents in target if any
        await targetCol.deleteMany({});
        await targetCol.insertMany(docs);
        console.log(`  [MIGRATED] Collection "${colName}": ${docs.length} documents copied.`);
        totalMigrated += docs.length;
      } else {
        console.log(`  [EMPTY] Collection "${colName}": 0 documents.`);
      }
    }

    console.log(`\n -> Total ${totalMigrated} documents migrated to database "${targetDbName}".`);

    // Update .env MONGODB_DB_NAME
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /MONGODB_DB_NAME=.*/g,
        `MONGODB_DB_NAME=${targetDbName}`
      );
      if (!envContent.includes(`MONGODB_DB_NAME=${targetDbName}`)) {
        envContent += `\nMONGODB_DB_NAME=${targetDbName}\nDB_NAME=${targetDbName}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(` -> Updated .env file to MONGODB_DB_NAME=${targetDbName}`);
    }

    console.log(`\n====================================================`);
    console.log(` DATABASE MIGRATION COMPLETED SUCCESSFULLY!        `);
    console.log(`====================================================\n`);

  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
    throw err;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  migrateDatabase().catch((err) => {
    process.exit(1);
  });
}

module.exports = migrateDatabase;
