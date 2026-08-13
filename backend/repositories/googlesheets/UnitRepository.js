const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = ['id', 'name', 'shortName', 'status', 'createdAt', 'updatedAt'];

class UnitRepository extends BaseSheetRepository {
  constructor() {
    super('Units', COLUMNS, ID_PREFIXES.UNIT, 'id');
  }
}

module.exports = UnitRepository;
