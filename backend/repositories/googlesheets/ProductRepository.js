const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'sku',
  'name',
  'categoryId',
  'brandId',
  'unitId',
  'description',
  'purchasePrice',
  'pricingMethod',       // 'Percentage Markup' | 'Fixed Selling Price'
  'markupPercentage',
  'sellingPrice',
  'minimumStock',
  'openingStock',
  'batchNumber',
  'expiryDate',
  'status',
  'priceEffectiveDate',
  'createdAt',
  'updatedAt'
];

class ProductRepository extends BaseSheetRepository {
  constructor() {
    super('Products', COLUMNS, ID_PREFIXES.PRODUCT, 'id');
  }

  async findBySku(sku) {
    return this.findOne({ sku });
  }
}

module.exports = ProductRepository;
