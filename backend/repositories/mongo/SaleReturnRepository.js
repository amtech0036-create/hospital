const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'saleId', 'customerId', 'returnDate', 'subtotal', 'total',
  'note', 'status', 'createdBy', 'createdAt', 'updatedAt'
];

class SaleReturnRepository extends BaseMongoRepository {
  constructor() {
    super('sale_returns', COLUMNS, ID_PREFIXES.SALE_RETURN, 'id');
  }

  async findBySale(saleId) {
    return this.findAll({ saleId });
  }
}

module.exports = SaleReturnRepository;
