const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'supplierId',
  'type',           // Opening Balance | Purchase | Payment Made | Purchase Return | Adjustment Increase | Adjustment Decrease
  'amount',         // always stored positive; direction comes from `type`
  'referenceType',  // e.g. 'Purchase', 'Manual' — which module created this
  'referenceId',    // ID of the purchase/payment/etc that caused this, if any
  'note',
  'createdBy',
  'transactionDate',
  'createdAt',
  'updatedAt'
];

// Types that INCREASE what we owe the supplier.
const INCREASE_TYPES = ['Opening Balance', 'Purchase', 'Adjustment Increase'];
// Types that DECREASE what we owe the supplier.
const DECREASE_TYPES = ['Payment Made', 'Purchase Return', 'Adjustment Decrease'];

class SupplierTransactionRepository extends BaseSheetRepository {
  constructor() {
    super('Supplier_Transactions', COLUMNS, ID_PREFIXES.SUPPLIER_TXN, 'id');
  }

  async findBySupplier(supplierId) {
    return this.findAll({ supplierId });
  }

  /**
   * Computes how much we currently owe a single supplier by summing all
   * their transactions. This is the ONLY correct way to know the balance —
   * never trust a manually-stored "due amount" field.
   */
  async computeBalance(supplierId) {
    const txns = await this.findBySupplier(supplierId);
    return txns.reduce((total, t) => {
      const amt = parseFloat(t.amount) || 0;
      if (INCREASE_TYPES.includes(t.type)) return total + amt;
      if (DECREASE_TYPES.includes(t.type)) return total - amt;
      return total;
    }, 0);
  }

  /**
   * Computes balances for every supplier in one pass — far cheaper than
   * calling computeBalance() per supplier when listing many suppliers.
   */
  async computeBalanceForAll() {
    const all = await this.findAll();
    const totals = {};
    for (const t of all) {
      const amt = parseFloat(t.amount) || 0;
      const delta = INCREASE_TYPES.includes(t.type) ? amt : DECREASE_TYPES.includes(t.type) ? -amt : 0;
      totals[t.supplierId] = (totals[t.supplierId] || 0) + delta;
    }
    return totals;
  }
}

module.exports = SupplierTransactionRepository;
module.exports.INCREASE_TYPES = INCREASE_TYPES;
module.exports.DECREASE_TYPES = DECREASE_TYPES;
