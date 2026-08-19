const SimpleLookupService = require('./SimpleLookupService');
const { unitRepository } = require('../repositories');

const DEFAULT_UNITS = [
  { name: 'Pieces', shortName: 'pcs' },
  { name: 'Box', shortName: 'box' },
  { name: 'Packet', shortName: 'pkt' },
  { name: 'Carton', shortName: 'ctn' },
  { name: 'Dozen', shortName: 'doz' },
  { name: 'Set', shortName: 'set' },
  { name: 'Kilogram', shortName: 'kg' },
  { name: 'Liter', shortName: 'L' },
  { name: 'Meter', shortName: 'm' }
];

class UnitService extends SimpleLookupService {
  constructor() {
    super(unitRepository, 'Unit');
  }

  async list(filter = {}) {
    let records = await super.list(filter);
    if (records.length === 0 && (!filter.status || filter.status === 'Active')) {
      const totalCount = await this.repository.count();
      if (totalCount === 0) {
        for (const u of DEFAULT_UNITS) {
          try {
            await this.repository.create({ name: u.name, shortName: u.shortName, status: 'Active' });
          } catch (err) {
            // Ignore if unit name already exists
          }
        }
        records = await super.list(filter);
      }
    }
    return records;
  }
}

module.exports = new UnitService();
