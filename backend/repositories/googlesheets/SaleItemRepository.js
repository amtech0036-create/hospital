const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'saleId',
  'productId',
  'productName',
  'quantity',
  'unitPrice',
  'unitCost',
  'lineTotal',
  'createdAt',
  'updatedAt'
];

class SaleItemRepository extends BaseSheetRepository {
  constructor() {
    super('Sale_Items', COLUMNS, ID_PREFIXES.SALE_ITEM, 'id');
  }

  async findBySale(saleId) {
    return this.findAll({ saleId });
  }
}

module.exports = SaleItemRepository;
