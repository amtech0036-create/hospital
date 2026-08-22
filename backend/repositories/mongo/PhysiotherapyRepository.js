const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'sessionRef', 'patientId', 'uhid', 'patientName', 
  'therapistName', 'treatmentPlan', 'sessionNotes', 'progressMetrics', 
  'status', 'createdAt', 'updatedAt'
];

class PhysiotherapyRepository extends BaseMongoRepository {
  constructor() {
    super('physiotherapy_sessions', COLUMNS, ID_PREFIXES.PHYSIOTHERAPY || 'PT', 'id');
  }
}

module.exports = PhysiotherapyRepository;
