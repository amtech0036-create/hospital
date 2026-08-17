const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'name', 'phone', 'email', 'address', 'openingBalance', 'status', 'createdAt', 'updatedAt'
];

class CustomerRepository extends BaseMongoRepository {
  constructor() {
    super('customers', COLUMNS, ID_PREFIXES.CUSTOMER, 'id');
  }
}

module.exports = CustomerRepository;
