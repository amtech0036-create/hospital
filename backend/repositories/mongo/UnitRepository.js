const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = ['id', 'name', 'shortName', 'status', 'createdAt', 'updatedAt'];

class UnitRepository extends BaseMongoRepository {
  constructor() {
    super('units', COLUMNS, ID_PREFIXES.UNIT, 'id');
  }
}

module.exports = UnitRepository;
