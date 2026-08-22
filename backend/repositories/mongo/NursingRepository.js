const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'nursingLogId', 'patientId', 'uhid', 'nurseId', 
  'nurseName', 'vitalSigns', 'marRecords', 'shiftHandover', 
  'careNotes', 'taskStatus', 'createdAt', 'updatedAt'
];

class NursingRepository extends BaseMongoRepository {
  constructor() {
    super('nursing_logs', COLUMNS, ID_PREFIXES.NURSING, 'id');
  }
}

module.exports = NursingRepository;
