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

class SupplierRepository extends BaseSheetRepository {
  constructor() {
    super('Suppliers', COLUMNS, ID_PREFIXES.SUPPLIER, 'id');
  }
}

module.exports = SupplierRepository;
