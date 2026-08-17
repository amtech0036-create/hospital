const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'category', 'amount', 'paymentMethod', 'expenseDate',
  'note', 'createdBy', 'createdAt', 'updatedAt'
];

class ExpenseRepository extends BaseMongoRepository {
  constructor() {
    super('expenses', COLUMNS, ID_PREFIXES.EXPENSE, 'id');
  }
}

module.exports = ExpenseRepository;
