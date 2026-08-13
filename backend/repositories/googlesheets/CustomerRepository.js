const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'name',
  'phone',
  'email',
  'address',
  'openingBalance', // informational only, like Product.openingStock — never the live balance
  'status',
  'createdAt',
  'updatedAt'
];

class CustomerRepository extends BaseSheetRepository {
  constructor() {
    super('Customers', COLUMNS, ID_PREFIXES.CUSTOMER, 'id');
  }
}

module.exports = CustomerRepository;
