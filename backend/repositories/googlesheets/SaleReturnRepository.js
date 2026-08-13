const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'saleId',
  'customerId',
  'returnDate',
  'subtotal',
  'total',
  'note',
  'status',
  'createdBy',
  'createdAt',
  'updatedAt'
];

class SaleReturnRepository extends BaseSheetRepository {
  constructor() {
    super('Sale_Returns', COLUMNS, ID_PREFIXES.SALE_RETURN, 'id');
  }

  async findBySale(saleId) {
    return this.findAll({ saleId });
  }
}

module.exports = SaleReturnRepository;
