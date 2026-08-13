const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'productId',
  'type',            // Opening Stock | Purchase | Sale | Sales Return | Purchase Return | Stock Adjustment In | Stock Adjustment Out | Damaged | Expired
  'quantity',         // always stored positive; direction comes from `type`
  'referenceType',     // e.g. 'Purchase', 'Sale', 'Manual' — which module created this
  'referenceId',       // ID of the purchase/sale/etc that caused this, if any
  'note',
  'createdBy',
  'transactionDate',
  'createdAt',
  'updatedAt'
];

// Transaction types that INCREASE stock.
const STOCK_IN_TYPES = ['Opening Stock', 'Purchase', 'Sales Return', 'Stock Adjustment In'];
// Transaction types that DECREASE stock.
const STOCK_OUT_TYPES = ['Sale', 'Purchase Return', 'Stock Adjustment Out', 'Damaged', 'Expired'];

class StockTransactionRepository extends BaseSheetRepository {
  constructor() {
    super('Stock_Transactions', COLUMNS, ID_PREFIXES.STOCK_TXN, 'id');
  }

  async findByProduct(productId) {
    return this.findAll({ productId });
  }

  /**
   * Computes current stock for a single product by summing all
   * transactions. This is the ONLY correct way to know current stock —
   * never trust a manually-stored number.
   */
  async computeCurrentStock(productId) {
    const txns = await this.findByProduct(productId);
    return txns.reduce((total, t) => {
      const qty = parseFloat(t.quantity) || 0;
      if (STOCK_IN_TYPES.includes(t.type)) return total + qty;
      if (STOCK_OUT_TYPES.includes(t.type)) return total - qty;
      return total;
    }, 0);
  }

  /**
   * Computes current stock for every product in one pass — far cheaper
   * than calling computeCurrentStock() per product when listing many
   * products, since it reads the sheet once.
   */
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
