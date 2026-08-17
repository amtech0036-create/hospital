const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'productId', 'type', 'quantity', 'referenceType', 'referenceId',
  'note', 'createdBy', 'transactionDate', 'createdAt', 'updatedAt'
];

const STOCK_IN_TYPES = ['Opening Stock', 'Purchase', 'Sales Return', 'Stock Adjustment In'];
const STOCK_OUT_TYPES = ['Sale', 'Purchase Return', 'Stock Adjustment Out', 'Damaged', 'Expired'];

class StockTransactionRepository extends BaseMongoRepository {
  constructor() {
    super('stock_transactions', COLUMNS, ID_PREFIXES.STOCK_TXN, 'id');
  }

  async findByProduct(productId) {
    return this.findAll({ productId });
  }

  async computeCurrentStock(productId) {
    const txns = await this.findByProduct(productId);
    return txns.reduce((total, t) => {
      const qty = parseFloat(t.quantity) || 0;
      if (STOCK_IN_TYPES.includes(t.type)) return total + qty;
      if (STOCK_OUT_TYPES.includes(t.type)) return total - qty;
      return total;
    }, 0);
  }

  async computeCurrentStockForAll() {
    const all = await this.findAll();
    const totals = {};
    for (const t of all) {
      const qty = parseFloat(t.quantity) || 0;
      const delta = STOCK_IN_TYPES.includes(t.type) ? qty : STOCK_OUT_TYPES.includes(t.type) ? -qty : 0;
      totals[t.productId] = (totals[t.productId] || 0) + delta;
    }
    return totals;
  }
}

module.exports = StockTransactionRepository;
module.exports.STOCK_IN_TYPES = STOCK_IN_TYPES;
module.exports.STOCK_OUT_TYPES = STOCK_OUT_TYPES;
