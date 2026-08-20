/**
 * Tenant Master Seeder Script
 * Bootstraps default tenant (TNT-000001 / subdomain: default)
 */

const { tenantRepository } = require('../backend/repositories');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');

async function seedTenant() {
  console.log('[SEED] Connecting to MongoDB and bootstrapping default tenant...');
  await connectMongo();

  const existing = await tenantRepository.findBySubdomain('default');
  if (!existing) {
    const tenant = await tenantRepository.create({
      id: 'TNT-000001',
      name: 'Default Hospital Tenant',
      subdomain: 'default',
      contactEmail: 'admin@amtechslnbderp.com',
      isActive: true,
      maxUsers: 100
    });
    console.log(`[SEED SUCCESS] Created default tenant: ${tenant.name} (${tenant.id} / ${tenant.subdomain})`);
  } else {
    console.log(`[SEED] Default tenant already exists: ${existing.name} (${existing.id})`);
  }

  await closeMongo();
}

if (require.main === module) {
  seedTenant().catch((err) => {
    console.error('[SEED ERROR]', err);
    process.exit(1);
  });
}

module.exports = seedTenant;
