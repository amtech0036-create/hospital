const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'emergencyId', 'patientId', 'uhid', 'patientName', 
  'triageCategory', 'triageLevel', 'vitalSigns', 'chiefComplaint', 
  'attendingDoctor', 'assignedNurse', 'traumaDetails', 'status', 
  'bedNumber', 'admissionRef', 'billingRef', 'createdAt', 'updatedAt'
];

class EmergencyRepository extends BaseMongoRepository {
  constructor() {
    super('emergencies', COLUMNS, ID_PREFIXES.EMERGENCY, 'id');
  }
}

module.exports = EmergencyRepository;
