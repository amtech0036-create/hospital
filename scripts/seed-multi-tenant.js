require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectMongo, getCollection, closeMongo } = require('../backend/config/mongoClient');
const { tenantRepository, userRepository } = require('../backend/repositories');
const LicenseService = require('../backend/services/LicenseService');

const COLLECTIONS_TO_BACKFILL = [
  'users',
  'categories',
  'brands',
  'units',
  'products',
  'product_price_history',
  'stock_transactions',
  'customers',
  'customer_transactions',
  'suppliers',
  'supplier_transactions',
  'sales',
  'sale_items',
  'sale_returns',
  'sale_return_items',
  'purchases',
  'purchase_items',
  'purchase_returns',
  'purchase_return_items',
  'challans',
  'challan_items',
  'payments',
  'expenses',
  'employees',
  'salaries',
  'settings'
];

async function seedMultiTenant() {
  console.log('--- Multi-Tenant Migration & Seeding ---');
  if (process.env.DB_DRIVER === 'mongo' || process.env.MONGODB_URI) {
    try {
      await connectMongo();
    } catch (e) {
      console.warn('MongoDB connection notice:', e.message);
    }
  }

  // 1. Provision Default Tenant (TNT-000001)
  let defaultTenant = await tenantRepository.findBySubdomain('default');
  const expYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  if (!defaultTenant) {
    const key = LicenseService.generateLicenseKey({
      subdomain: 'default',
      licenseTier: 4,
      maxUsers: 500,
      expiresAt: expYear
    });
    defaultTenant = await tenantRepository.create({
      id: 'TNT-000001',
      name: 'Default Enterprise Tenant',
      subdomain: 'default',
      licenseKey: key,
      licenseTier: 4,
      maxUsers: 500,
      isActive: true,
      expiresAt: expYear
    });
    console.log('Created Default Tenant: TNT-000001 (subdomain: default, Tier 4: 500 users)');
  } else {
    console.log(`Default Tenant found: ${defaultTenant.id} (${defaultTenant.subdomain})`);
  }

  // 2. Provision ShopZ Tenant (TNT-000002)
  let shopzTenant = await tenantRepository.findBySubdomain('shopz');
  if (!shopzTenant) {
    const key = LicenseService.generateLicenseKey({
      subdomain: 'shopz',
      licenseTier: 1,
      maxUsers: 15,
      expiresAt: expYear
    });
    shopzTenant = await tenantRepository.create({
      id: 'TNT-000002',
      name: 'ShopZ Retail Solutions',
      subdomain: 'shopz',
      licenseKey: key,
      licenseTier: 1,
      maxUsers: 15,
      isActive: true,
      expiresAt: expYear
    });
    console.log('Created ShopZ Tenant: TNT-000002 (subdomain: shopz, Tier 1: 15 users)');
  } else {
    console.log(`ShopZ Tenant found: ${shopzTenant.id} (${shopzTenant.subdomain})`);
  }

  // 3. Backfill existing collection documents without tenantId -> TNT-000001
  console.log('\nBackfilling existing records with default tenantId (TNT-000001)...');
  for (const colName of COLLECTIONS_TO_BACKFILL) {
    try {
      const col = await getCollection(colName);
      const res = await col.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }] },
        { $set: { tenantId: defaultTenant.id } }
      );
      if (res.modifiedCount > 0) {
        console.log(`  ${colName}: updated ${res.modifiedCount} records -> ${defaultTenant.id}`);
      }
    } catch (err) {
      // Collection may not exist yet, that's fine
    }
  }

  // 4. Seed SuperAdmin user if configured
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (superAdminEmail) {
    const existingSuper = await userRepository.findOne({ email: superAdminEmail.toLowerCase() });
    if (!existingSuper) {
      const superSecret = process.env.SUPER_ADMIN_SECRET;
      if (!superSecret) {
        console.error('ERROR: SUPER_ADMIN_SECRET environment variable is required to create SuperAdmin user.');
        process.exit(1);
      }
      const passwordHash = await bcrypt.hash(superSecret, 10);
      await userRepository.create({
        tenantId: defaultTenant.id,
        name: 'Super Admin',
        email: superAdminEmail.toLowerCase(),
        passwordHash,
        role: 'Admin',
        status: 'Active'
      });
      console.log(`\nCreated SuperAdmin user: ${superAdminEmail} (Tenant: ${defaultTenant.id})`);
    }
  }

  // 5. Seed ShopZ Admin user
  const shopzUserEmail = 'admin@shopz.com';
  const existingShopzUser = await userRepository.findOne({ email: shopzUserEmail, tenantId: shopzTenant.id });
  if (!existingShopzUser) {
    const passwordHash = await bcrypt.hash('shopzpass123', 10);
    await userRepository.create({
      tenantId: shopzTenant.id,
      name: 'ShopZ Admin',
      email: shopzUserEmail,
      passwordHash,
      role: 'Admin',
      status: 'Active'
    });
    console.log(`\nCreated ShopZ Admin user: ${shopzUserEmail} / shopzpass123 (Tenant: TNT-000002)`);
  }

  console.log('\n--- Multi-Tenant Seeding Completed Successfully ---');
  try {
    await closeMongo();
  } catch (e) {}

  process.exit(0);
}

seedMultiTenant().catch((err) => {
  console.error('Seed multi-tenant error:', err);
  process.exit(1);
});
