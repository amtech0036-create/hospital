const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'category',
  'amount',
  'paymentMethod',
  'expenseDate',
  'note',
  'createdBy',
  'createdAt',
  'updatedAt'
];

class ExpenseRepository extends BaseSheetRepository {
  constructor() {
    super('Expenses', COLUMNS, ID_PREFIXES.EXPENSE, 'id');
  }
}

module.exports = ExpenseRepository;
