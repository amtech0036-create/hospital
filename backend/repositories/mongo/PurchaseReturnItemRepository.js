const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'purchaseReturnId', 'productId', 'productName', 'quantity', 'unitCost',
  'lineTotal', 'createdAt', 'updatedAt'
];

class PurchaseReturnItemRepository extends BaseMongoRepository {
  constructor() {
    super('purchase_return_items', COLUMNS, ID_PREFIXES.PURCHASE_RETURN_ITEM, 'id');
  }

  async findByPurchaseReturn(purchaseReturnId) {
    return this.findAll({ purchaseReturnId });
  }
}

module.exports = PurchaseReturnItemRepository;
