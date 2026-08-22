const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'assetTag', 'equipmentName', 'modelNumber', 
  'department', 'calibrationDueDate', 'lastServiceDate', 'breakdownLogs', 
  'status', 'createdAt', 'updatedAt'
];

class BiomedicalRepository extends BaseMongoRepository {
  constructor() {
    super('biomedical_equipment', COLUMNS, ID_PREFIXES.BIOMEDICAL || 'BMED', 'id');
  }
}

module.exports = BiomedicalRepository;
