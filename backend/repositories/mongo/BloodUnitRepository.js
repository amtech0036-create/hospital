const BaseMongoRepository = require('./BaseMongoRepository');
const BloodUnit = require('../../models/BloodUnit');

class BloodUnitRepository extends BaseMongoRepository {
  constructor() {
    super('blood_units', BloodUnit.columns, 'BLD');
  }
}

module.exports = new BloodUnitRepository();
