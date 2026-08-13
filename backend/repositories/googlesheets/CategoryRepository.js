const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'];

class CategoryRepository extends BaseSheetRepository {
  constructor() {
    super('Categories', COLUMNS, ID_PREFIXES.CATEGORY, 'id');
  }
}

module.exports = CategoryRepository;
