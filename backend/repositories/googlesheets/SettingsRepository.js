const BaseSheetRepository = require('./BaseSheetRepository');

const COLUMNS = ['id', 'key', 'value', 'updatedAt'];

class SettingsRepository extends BaseSheetRepository {
  constructor() {
    super('Settings', COLUMNS, 'SET', 'id');
  }

  async getAllAsMap() {
    const rows = await this.findAll();
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async upsert(key, value) {
    const existing = await this.findById(key);
    const now = new Date().toISOString();
    if (existing) {
      return this.update(key, { key, value, updatedAt: now });
    }
    return this.create({ id: key, key, value, updatedAt: now });
  }
}

module.exports = SettingsRepository;
