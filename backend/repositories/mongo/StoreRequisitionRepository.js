const BaseMongoRepository = require('./BaseMongoRepository');
const StoreRequisition = require('../../models/StoreRequisition');

class StoreRequisitionRepository extends BaseMongoRepository {
  constructor() {
    super('store_requisitions', StoreRequisition.columns, 'REQ');
  }
}

module.exports = new StoreRequisitionRepository();
