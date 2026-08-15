const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'purchaseId', 'productId', 'productName', 'quantity', 'unitCost',
  'lineTotal', 'createdAt', 'updatedAt'
];

class PurchaseItemRepository extends BaseMongoRepository {
  constructor() {
    super('purchase_items', COLUMNS, ID_PREFIXES.PURCHASE_ITEM, 'id');
  }

  async findByPurchase(purchaseId) {
    return this.findAll({ purchaseId });
  }
}

module.exports = PurchaseItemRepository;
