const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'purchaseReturnId',
  'productId',
  'productName',
  'quantity',
  'unitCost',
  'lineTotal',
  'createdAt',
  'updatedAt'
];

class PurchaseReturnItemRepository extends BaseSheetRepository {
  constructor() {
    super('Purchase_Return_Items', COLUMNS, ID_PREFIXES.PURCHASE_RETURN_ITEM, 'id');
  }

  async findByPurchaseReturn(purchaseReturnId) {
    return this.findAll({ purchaseReturnId });
  }
}

module.exports = PurchaseReturnItemRepository;
