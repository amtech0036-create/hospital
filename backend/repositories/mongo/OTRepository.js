const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'surgeryId', 'patientId', 'uhid', 'patientName', 
  'procedureName', 'otRoom', 'leadSurgeon', 'anesthetist', 'preOpAssessment', 
  'checklistVerified', 'procedureNotes', 'postOpNotes', 'consumablesUsed', 
  'status', 'scheduledTime', 'createdAt', 'updatedAt'
];

class OTRepository extends BaseMongoRepository {
  constructor() {
    super('ot_surgeries', COLUMNS, ID_PREFIXES.OT || 'OT', 'id');
  }
}

module.exports = OTRepository;
