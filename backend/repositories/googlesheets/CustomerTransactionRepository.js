const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'customerId',
  'type',           // Opening Balance | Invoice | Payment Received | Sales Return | Adjustment Increase | Adjustment Decrease
  'amount',         // always stored positive; direction comes from `type`
  'referenceType',  // e.g. 'Sale', 'Manual' — which module created this
  'referenceId',    // ID of the invoice/payment/etc that caused this, if any
  'note',
  'createdBy',
  'transactionDate',
  'createdAt',
  'updatedAt'
];

// Types that INCREASE what the customer owes us (debit the customer).
const INCREASE_TYPES = ['Opening Balance', 'Invoice', 'Adjustment Increase'];
// Types that DECREASE what the customer owes us (credit the customer).
const DECREASE_TYPES = ['Payment Received', 'Sales Return', 'Adjustment Decrease'];

class CustomerTransactionRepository extends BaseSheetRepository {
  constructor() {
    super('Customer_Transactions', COLUMNS, ID_PREFIXES.CUSTOMER_TXN, 'id');
  }

  async findByCustomer(customerId) {
    return this.findAll({ customerId });
  }

  /**
   * Computes how much a single customer currently owes by summing all
   * their transactions. This is the ONLY correct way to know the balance —
   * never trust a manually-stored "due amount" field.
   */
  async computeBalance(customerId) {
    const txns = await this.findByCustomer(customerId);
    return txns.reduce((total, t) => {
      const amt = parseFloat(t.amount) || 0;
      if (INCREASE_TYPES.includes(t.type)) return total + amt;
      if (DECREASE_TYPES.includes(t.type)) return total - amt;
      return total;
    }, 0);
  }

  /**
   * Computes balances for every customer in one pass — far cheaper than
   * calling computeBalance() per customer when listing many customers.
   */
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
