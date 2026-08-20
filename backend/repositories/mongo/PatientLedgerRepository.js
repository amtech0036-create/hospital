const BaseMongoRepository = require('./BaseMongoRepository');
const PatientLedger = require('../../models/PatientLedger');

class PatientLedgerRepository extends BaseMongoRepository {
  constructor() {
    super('patient_ledgers', PatientLedger.columns, 'LED');
  }
}

module.exports = new PatientLedgerRepository();
