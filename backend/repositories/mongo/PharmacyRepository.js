const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'medicineId', 'code', 'brandName', 'genericName', 
  'category', 'manufacturer', 'batchNumber', 'expiryDate', 'quantityInStock', 
  'unitPrice', 'purchasePrice', 'rackLocation', 'reorderLevel', 'status', 
  'createdAt', 'updatedAt'
];

class PharmacyRepository extends BaseMongoRepository {
  constructor() {
    super('pharmacy_medicines', COLUMNS, ID_PREFIXES.PHARMACY, 'id');
  }
}

module.exports = PharmacyRepository;
