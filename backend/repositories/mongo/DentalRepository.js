const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'dentalRecordId', 'patientId', 'uhid', 'patientName', 
  'dentistName', 'toothMatrix', 'procedureDone', 'treatmentPlan', 
  'status', 'createdAt', 'updatedAt'
];

class DentalRepository extends BaseMongoRepository {
  constructor() {
    super('dental_records', COLUMNS, ID_PREFIXES.DENTAL || 'DEN', 'id');
  }
}

module.exports = DentalRepository;
