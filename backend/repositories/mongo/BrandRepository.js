const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'];

class BrandRepository extends BaseMongoRepository {
  constructor() {
    super('brands', COLUMNS, ID_PREFIXES.BRAND, 'id');
  }
}

module.exports = BrandRepository;
