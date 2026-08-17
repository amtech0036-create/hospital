require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');
const { tenantRepository, userRepository } = require('../backend/repositories');
const LicenseService = require('../backend/services/LicenseService');

async function provisionTechland() {
  console.log('--- Provisioning TechLand Store Tenant ---');
  if (process.env.DB_DRIVER === 'mongo' || process.env.MONGODB_URI) {
    try {
      await connectMongo();
    } catch (e) {}
  }

  const subdomain = 'techland';
  const expYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  let tenant = await tenantRepository.findBySubdomain(subdomain);
  if (!tenant) {
    const key = LicenseService.generateLicenseKey({
      subdomain,
      licenseTier: 2,
      maxUsers: 50,
      expiresAt: expYear
    });

    tenant = await tenantRepository.create({
      name: 'TechLand Store',
      subdomain,
      licenseKey: key,
      licenseTier: 2,
      maxUsers: 50,
      isActive: true,
      expiresAt: expYear
    });
    console.log(`Created Tenant: ${tenant.name} [ID: ${tenant.id}] (subdomain: ${tenant.subdomain}, Tier 2: 50 users)`);
  } else {
    console.log(`Tenant already exists: ${tenant.name} [ID: ${tenant.id}] (subdomain: ${tenant.subdomain})`);
  }

  // Admin Credentials for TechLand Store
  const adminEmail = 'admin@techland.com';
  const adminPassword = 'techlandpass123';

  let adminUser = await userRepository.findOne({ email: adminEmail, tenantId: tenant.id });
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  if (adminUser) {
    await userRepository.update(adminUser.id, {
      name: 'TechLand Admin',
      passwordHash,
      role: 'Admin',
      status: 'Active'
    });
    console.log(`Updated Admin user: ${adminEmail} (Tenant: ${tenant.id})`);
  } else {
    adminUser = await userRepository.create({
      tenantId: tenant.id,
      name: 'TechLand Admin',
      email: adminEmail,
      passwordHash,
      role: 'Admin',
      status: 'Active'
    });
    console.log(`Created Admin user: ${adminEmail} (Tenant: ${tenant.id})`);
  }

  console.log('\n======================================================');
  console.log('  TechLand Store Credentials & Provisioning Details:');
  console.log('======================================================');
  console.log(`  Tenant ID:   ${tenant.id}`);
  console.log(`  Tenant Name: ${tenant.name}`);
  console.log(`  Subdomain:   ${tenant.subdomain}`);
  console.log(`  License Tier: Tier 2 (up to 50 users)`);
  console.log(`  Admin Email: ${adminEmail}`);
  console.log(`  Admin Pass:  ${adminPassword}`);
  console.log('======================================================\n');

  try {
    await closeMongo();
  } catch (e) {}

  process.exit(0);
}

provisionTechland().catch((err) => {
  console.error('Provisioning error:', err);
  process.exit(1);
});
