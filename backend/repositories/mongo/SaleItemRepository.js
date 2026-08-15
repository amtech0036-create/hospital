const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'saleId', 'productId', 'productName', 'quantity', 'unitPrice',
  'unitCost', 'lineTotal', 'createdAt', 'updatedAt'
];

class SaleItemRepository extends BaseMongoRepository {
  constructor() {
    super('sale_items', COLUMNS, ID_PREFIXES.SALE_ITEM, 'id');
  }

  async findBySale(saleId) {
    return this.findAll({ saleId });
  }
}

module.exports = SaleItemRepository;
