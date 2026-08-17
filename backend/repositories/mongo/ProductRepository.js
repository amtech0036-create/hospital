const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'sku', 'name', 'categoryId', 'brandId', 'unitId', 'description',
  'purchasePrice', 'pricingMethod', 'markupPercentage', 'sellingPrice',
  'minimumStock', 'openingStock', 'batchNumber', 'expiryDate', 'status',
  'priceEffectiveDate', 'createdAt', 'updatedAt'
];

class ProductRepository extends BaseMongoRepository {
  constructor() {
    super('products', COLUMNS, ID_PREFIXES.PRODUCT, 'id');
  }

  async findBySku(sku) {
    return this.findOne({ sku });
  }
}

module.exports = ProductRepository;
