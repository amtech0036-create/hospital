const BaseSheetRepository = require('./BaseSheetRepository');

const COLUMNS = [
  'id',
  'productId',
  'previousPurchasePrice',
  'newPurchasePrice',
  'previousMarkup',
  'newMarkup',
  'previousSellingPrice',
  'newSellingPrice',
  'effectiveDate',
  'changedBy',
  'reason',
  'createdAt',
  'updatedAt'
];

class ProductPriceHistoryRepository extends BaseSheetRepository {
  constructor() {
    // Prefix "PPH" — this table is append-only audit trail, never updated/deleted.
    super('Product_Price_History', COLUMNS, 'PPH', 'id');
  }

  async findByProduct(productId) {
    return this.findAll({ productId });
  }
}

module.exports = ProductPriceHistoryRepository;
