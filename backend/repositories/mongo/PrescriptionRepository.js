const BaseMongoRepository = require('./BaseMongoRepository');
const Prescription = require('../../models/Prescription');

class PrescriptionRepository extends BaseMongoRepository {
  constructor() {
    super('prescriptions', Prescription.columns, 'RX');
  }
}

module.exports = new PrescriptionRepository();
