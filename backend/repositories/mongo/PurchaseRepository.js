const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'supplierId', 'purchaseDate', 'subtotal', 'discount', 'total', 'amountPaid',
  'paymentMethod', 'status', 'note', 'createdBy', 'createdAt', 'updatedAt'
];

class PurchaseRepository extends BaseMongoRepository {
  constructor() {
    super('purchases', COLUMNS, ID_PREFIXES.PURCHASE, 'id');
  }

  async findBySupplier(supplierId) {
    return this.findAll({ supplierId });
  }
}

module.exports = PurchaseRepository;
