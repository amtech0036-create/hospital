const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'];

class BrandRepository extends BaseSheetRepository {
  constructor() {
    super('Brands', COLUMNS, ID_PREFIXES.BRAND, 'id');
  }
}

module.exports = BrandRepository;
