const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'name', 'phone', 'email', 'address', 'openingBalance', 'status', 'createdAt', 'updatedAt'
];

class SupplierRepository extends BaseMongoRepository {
  constructor() {
    super('suppliers', COLUMNS, ID_PREFIXES.SUPPLIER, 'id');
  }
}

module.exports = SupplierRepository;
