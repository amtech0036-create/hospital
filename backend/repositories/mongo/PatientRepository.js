const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'uhid', 'fullName', 'gender', 'age', 'dob', 'bloodGroup',
  'phone', 'email', 'address', 'emergencyContact', 'referredDoctor', 'status',
  'createdAt', 'updatedAt'
];

class PatientRepository extends BaseMongoRepository {
  constructor() {
    super('patients', COLUMNS, ID_PREFIXES.PATIENT, 'id');
  }
}

module.exports = PatientRepository;
