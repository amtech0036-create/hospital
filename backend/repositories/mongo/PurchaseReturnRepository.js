const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'purchaseId', 'supplierId', 'returnDate', 'subtotal', 'total',
  'note', 'status', 'createdBy', 'createdAt', 'updatedAt'
];

class PurchaseReturnRepository extends BaseMongoRepository {
  constructor() {
    super('purchase_returns', COLUMNS, ID_PREFIXES.PURCHASE_RETURN, 'id');
  }

  async findByPurchase(purchaseId) {
    return this.findAll({ purchaseId });
  }
}

module.exports = PurchaseReturnRepository;
