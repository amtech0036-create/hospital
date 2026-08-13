const { body } = require('express-validator');
const { EXPENSE_CATEGORIES, PAYMENT_METHODS } = require('../services/ExpenseService');

const expenseCreateRules = [
  body('category').isIn(EXPENSE_CATEGORIES).withMessage(`category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number.'),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS),
  body('expenseDate').optional().isISO8601(),
  body('note').optional().trim()
];

module.exports = { expenseCreateRules };
