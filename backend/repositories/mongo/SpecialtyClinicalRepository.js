const BaseMongoRepository = require('./BaseMongoRepository');

const COLUMNS = [
  'id', 'tenantId', 'recordId', 'department', 'patientId', 'uhid', 
  'patientName', 'clinicalDetails', 'doctorName', 'status', 'createdAt', 'updatedAt'
];

class SpecialtyClinicalRepository extends BaseMongoRepository {
  constructor() {
    super('specialty_clinical_records', COLUMNS, 'SPC', 'id');
  }
}

module.exports = SpecialtyClinicalRepository;
