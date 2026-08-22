const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'radiologyId', 'patientId', 'uhid', 'patientName', 
  'modality', 'procedureName', 'radiologistId', 'radiologistName', 
  'imageUrls', 'findings', 'impression', 'status', 'createdAt', 'updatedAt'
];

class RadiologyRepository extends BaseMongoRepository {
  constructor() {
    super('radiology_orders', COLUMNS, ID_PREFIXES.RADIOLOGY, 'id');
  }
}

module.exports = RadiologyRepository;
