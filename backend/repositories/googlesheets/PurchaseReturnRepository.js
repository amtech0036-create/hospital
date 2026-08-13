const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'purchaseId',
  'supplierId',
  'returnDate',
  'subtotal',
  'total',
  'note',
  'status',
  'createdBy',
  'createdAt',
  'updatedAt'
];

class PurchaseReturnRepository extends BaseSheetRepository {
  constructor() {
    super('Purchase_Returns', COLUMNS, ID_PREFIXES.PURCHASE_RETURN, 'id');
  }

  async findByPurchase(purchaseId) {
    return this.findAll({ purchaseId });
  }
}

module.exports = PurchaseReturnRepository;
