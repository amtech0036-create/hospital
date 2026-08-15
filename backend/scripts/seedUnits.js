/**
 * Seeder script: Seeds standard metric and packaging measurement units.
 * Usage: node backend/scripts/seedUnits.js
 */
require('dotenv').config();
const UnitService = require('../services/UnitService');
const { connectMongo, closeMongo } = require('../config/mongoClient');

const METRIC_UNITS = [
  { name: 'Pieces', shortName: 'pcs' },
  { name: 'Box', shortName: 'box' },
  { name: 'Packet', shortName: 'pkt' },
  { name: 'Carton', shortName: 'ctn' },
  { name: 'Dozen', shortName: 'doz' },
  { name: 'Set', shortName: 'set' },
  { name: 'Bundle', shortName: 'bdl' },
  { name: 'Kilogram', shortName: 'kg' },
  { name: 'Gram', shortName: 'g' },
  { name: 'Milligram', shortName: 'mg' },
  { name: 'Metric Ton', shortName: 'MT' },
  { name: 'Liter', shortName: 'L' },
  { name: 'Milliliter', shortName: 'ml' },
  { name: 'Meter', shortName: 'm' },
  { name: 'Centimeter', shortName: 'cm' },
  { name: 'Millimeter', shortName: 'mm' },
  { name: 'Kilometer', shortName: 'km' },
  { name: 'Square Meter', shortName: 'sqm' },
  { name: 'Feet', shortName: 'ft' },
  { name: 'Square Feet', shortName: 'sqft' }
];

async function run() {
  await connectMongo();
  console.log('Seeding measurement units...');

  const existing = await UnitService.list();
  for (const u of existing) {
    if (u.name === 'Pcs' || u.name === 'Pieces') {
      await UnitService.update(u.id, { name: 'Pieces', shortName: 'pcs', status: 'Active' });
    }
  }

  let added = 0;
  for (const u of METRIC_UNITS) {
    try {
      await UnitService.create({ name: u.name, shortName: u.shortName, status: 'Active' });
      console.log(`Added unit: ${u.name} (${u.shortName})`);
      added++;
    } catch (err) {
      if (err.status !== 409) {
        console.error(`Error creating ${u.name}:`, err.message);
      }
    }
  }

  const activeUnits = await UnitService.list({ status: 'Active' });
  console.log(`Units seeding complete! Total active units: ${activeUnits.length}`);
  await closeMongo();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
