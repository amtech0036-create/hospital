const BaseMongoRepository = require('./BaseMongoRepository');
const Admission = require('../../models/Admission');

class AdmissionRepository extends BaseMongoRepository {
  constructor() {
    super('admissions', Admission.columns, 'ADM');
  }
}

module.exports = new AdmissionRepository();
