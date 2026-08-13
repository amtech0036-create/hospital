const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'supplierId',
  'purchaseDate',
  'subtotal',
  'discount',
  'total',
  'amountPaid',
  'paymentMethod',
  'status',
  'note',
  'createdBy',
  'createdAt',
  'updatedAt'
];

class PurchaseRepository extends BaseSheetRepository {
  constructor() {
    super('Purchases', COLUMNS, ID_PREFIXES.PURCHASE, 'id');
  }

  async findBySupplier(supplierId) {
    return this.findAll({ supplierId });
  }
}

module.exports = PurchaseRepository;
