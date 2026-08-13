const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'purchaseId',
  'productId',
  'productName',
  'quantity',
  'unitCost',
  'lineTotal',
  'createdAt',
  'updatedAt'
];

class PurchaseItemRepository extends BaseSheetRepository {
  constructor() {
    super('Purchase_Items', COLUMNS, ID_PREFIXES.PURCHASE_ITEM, 'id');
  }

  async findByPurchase(purchaseId) {
    return this.findAll({ purchaseId });
  }
}

module.exports = PurchaseItemRepository;
