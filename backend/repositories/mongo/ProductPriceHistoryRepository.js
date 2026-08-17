const BaseMongoRepository = require('./BaseMongoRepository');

const COLUMNS = [
  'id', 'tenantId', 'productId', 'previousPurchasePrice', 'newPurchasePrice', 'previousMarkup',
  'newMarkup', 'previousSellingPrice', 'newSellingPrice', 'effectiveDate',
  'changedBy', 'reason', 'createdAt', 'updatedAt'
];

class ProductPriceHistoryRepository extends BaseMongoRepository {
  constructor() {
    super('product_price_history', COLUMNS, 'PPH', 'id');
  }

  async findByProduct(productId) {
    return this.findAll({ productId });
  }
}

module.exports = ProductPriceHistoryRepository;
