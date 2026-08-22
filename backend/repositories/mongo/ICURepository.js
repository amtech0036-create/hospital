const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'icuLogId', 'patientId', 'uhid', 'patientName', 
  'bedNumber', 'ventilatorStatus', 'vitalsFlowsheet', 'intakeOutput', 
  'doctorNotes', 'nurseNotes', 'status', 'createdAt', 'updatedAt'
];

class ICURepository extends BaseMongoRepository {
  constructor() {
    super('icu_records', COLUMNS, ID_PREFIXES.ICU || 'ICU', 'id');
  }
}

module.exports = ICURepository;
