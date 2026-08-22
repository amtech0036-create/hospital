const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'labOrderId', 'patientId', 'uhid', 'patientName', 
  'testId', 'testName', 'category', 'sampleType', 'barcode', 'sampleStatus', 
  'technicianId', 'results', 'criticalAlert', 'verifiedBy', 'status', 
  'createdAt', 'updatedAt'
];

class PathologyRepository extends BaseMongoRepository {
  constructor() {
    super('pathology_orders', COLUMNS, ID_PREFIXES.PATHOLOGY, 'id');
  }
}

module.exports = PathologyRepository;
