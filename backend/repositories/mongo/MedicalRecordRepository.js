const BaseMongoRepository = require('./BaseMongoRepository');
const MedicalRecord = require('../../models/MedicalRecord');

class MedicalRecordRepository extends BaseMongoRepository {
  constructor() {
    super('medical_records', MedicalRecord.columns, 'MED');
  }
}

module.exports = new MedicalRecordRepository();
