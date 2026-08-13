const { body } = require('express-validator');
const { PAYMENT_METHODS } = require('../services/PayrollService');

const payrollCreateRules = [
  body('employeeId').trim().notEmpty().withMessage('employeeId is required.'),
  body('payMonth').optional().matches(/^\d{4}-\d{2}$/).withMessage('payMonth must be YYYY-MM.'),
  body('baseSalary').optional().isFloat({ min: 0 }).withMessage('baseSalary must be non-negative.'),
  body('bonus').optional().isFloat({ min: 0 }).withMessage('bonus must be non-negative.'),
  body('deductions').optional().isFloat({ min: 0 }).withMessage('deductions must be non-negative.'),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS),
  body('paidDate').optional().isISO8601(),
  body('note').optional().trim()
];

const payrollBulkRules = [
  body('payMonth').matches(/^\d{4}-\d{2}$/).withMessage('payMonth must be YYYY-MM.'),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS),
  body('note').optional().trim()
];

module.exports = { payrollCreateRules, payrollBulkRules };
