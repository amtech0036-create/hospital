const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'];

class CategoryRepository extends BaseMongoRepository {
  constructor() {
    super('categories', COLUMNS, ID_PREFIXES.CATEGORY, 'id');
  }
}

module.exports = CategoryRepository;
