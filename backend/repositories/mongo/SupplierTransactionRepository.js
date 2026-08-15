const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'supplierId', 'type', 'amount', 'referenceType', 'referenceId',
  'note', 'createdBy', 'transactionDate', 'createdAt', 'updatedAt'
];

const INCREASE_TYPES = ['Opening Balance', 'Purchase', 'Adjustment Increase'];
const DECREASE_TYPES = ['Payment Made', 'Purchase Return', 'Adjustment Decrease'];

class SupplierTransactionRepository extends BaseMongoRepository {
  constructor() {
    super('supplier_transactions', COLUMNS, ID_PREFIXES.SUPPLIER_TXN, 'id');
  }

  async findBySupplier(supplierId) {
    return this.findAll({ supplierId });
  }

  async computeBalance(supplierId) {
    const txns = await this.findBySupplier(supplierId);
    return txns.reduce((total, t) => {
      const amt = parseFloat(t.amount) || 0;
      if (INCREASE_TYPES.includes(t.type)) return total + amt;
      if (DECREASE_TYPES.includes(t.type)) return total - amt;
      return total;
    }, 0);
  }

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
