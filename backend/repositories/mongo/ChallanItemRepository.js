const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'challanId', 'productId', 'productName', 'quantity', 'createdAt', 'updatedAt'
];

class ChallanItemRepository extends BaseMongoRepository {
  constructor() {
    super('challan_items', COLUMNS, ID_PREFIXES.CHALLAN_ITEM, 'id');
  }

  async findByChallan(challanId) {
    return this.findAll({ challanId });
  }
}

module.exports = ChallanItemRepository;
