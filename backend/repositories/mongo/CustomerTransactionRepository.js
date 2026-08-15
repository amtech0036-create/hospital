const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'customerId', 'type', 'amount', 'referenceType', 'referenceId',
  'note', 'createdBy', 'transactionDate', 'createdAt', 'updatedAt'
];

const INCREASE_TYPES = ['Opening Balance', 'Invoice', 'Adjustment Increase'];
const DECREASE_TYPES = ['Payment Received', 'Sales Return', 'Adjustment Decrease'];

class CustomerTransactionRepository extends BaseMongoRepository {
  constructor() {
    super('customer_transactions', COLUMNS, ID_PREFIXES.CUSTOMER_TXN, 'id');
  }

  async findByCustomer(customerId) {
    return this.findAll({ customerId });
  }

  async computeBalance(customerId) {
    const txns = await this.findByCustomer(customerId);
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
      totals[t.customerId] = (totals[t.customerId] || 0) + delta;
    }
    return totals;
  }
}

module.exports = CustomerTransactionRepository;
module.exports.INCREASE_TYPES = INCREASE_TYPES;
module.exports.DECREASE_TYPES = DECREASE_TYPES;
