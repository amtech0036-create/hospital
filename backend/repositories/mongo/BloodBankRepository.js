const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'bagId', 'donorName', 'bloodGroup', 'componentType', 
  'quantityMl', 'collectionDate', 'expiryDate', 'crossMatchPatientUhid', 
  'issueStatus', 'status', 'createdAt', 'updatedAt'
];

class BloodBankRepository extends BaseMongoRepository {
  constructor() {
    super('blood_bank_inventory', COLUMNS, ID_PREFIXES.BLOOD_BANK || 'BB', 'id');
  }
}

module.exports = BloodBankRepository;
