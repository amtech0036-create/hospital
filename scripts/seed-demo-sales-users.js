require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');
const { userRepository } = require('../backend/repositories');

const USERS_TO_SEED = [
  {
    name: 'Demo Account',
    email: 'demo@amtech.com',
    password: 'demouser123',
    role: 'Demo',
    status: 'Active'
  },
  {
    name: 'Sales Representative',
    email: 'sales@amtech.com',
    password: 'salesuser123',
    role: 'Sales User',
    status: 'Active'
  }
];

async function seed() {
  console.log('Seeding Demo and Sales users...');
  
  if (process.env.DB_DRIVER === 'mongo' || process.env.MONGODB_URI) {
    try {
      await connectMongo();
    } catch (e) {
      console.warn('MongoDB connection failed or skipped:', e.message);
    }
  }

  for (const item of USERS_TO_SEED) {
    const existing = await userRepository.findByEmail(item.email);
    const passwordHash = await bcrypt.hash(item.password, 10);

    if (existing) {
      await userRepository.update(existing.id, {
        name: item.name,
        role: item.role,
        status: item.status,
        passwordHash
      });
      console.log(`Updated user: ${item.email} (${item.role})`);
    } else {
      await userRepository.create({
        name: item.name,
        email: item.email.toLowerCase(),
        passwordHash,
        role: item.role,
        status: item.status
      });
      console.log(`Created user: ${item.email} (${item.role})`);
    }
  }

  console.log('\nSeed completed successfully.');
  console.log('Credentials:');
  console.log('  1. Demo User:  demo@amtech.com / demouser123 (Role: Demo)');
  console.log('  2. Sales User: sales@amtech.com / salesuser123 (Role: Sales User)');

  try {
    await closeMongo();
  } catch (e) {}
  
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
