const BaseMongoRepository = require('./BaseMongoRepository');

const COLUMNS = [
  'id', 'tenantId', 'name', 'specialization', 'department', 'phone',
  'email', 'commissionType', 'commissionValue', 'digitalSignatureUrl',
  'status', 'createdAt', 'updatedAt'
];

class DoctorRepository extends BaseMongoRepository {
  constructor() {
    super('doctors', COLUMNS, 'DOC', 'id');
  }
}

module.exports = DoctorRepository;
