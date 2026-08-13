const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'saleReturnId',
  'productId',
  'productName',
  'quantity',
  'unitPrice',
  'lineTotal',
  'createdAt',
  'updatedAt'
];

class SaleReturnItemRepository extends BaseSheetRepository {
  constructor() {
    super('Sale_Return_Items', COLUMNS, ID_PREFIXES.SALE_RETURN_ITEM, 'id');
  }

  async findBySaleReturn(saleReturnId) {
    return this.findAll({ saleReturnId });
  }
}

module.exports = SaleReturnItemRepository;
