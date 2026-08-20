const BaseMongoRepository = require('./BaseMongoRepository');
const BedMaster = require('../../models/BedMaster');

class BedMasterRepository extends BaseMongoRepository {
  constructor() {
    super('bed_masters', BedMaster.columns, 'BED');
  }
}

module.exports = new BedMasterRepository();
