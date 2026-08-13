const { body } = require('express-validator');
const { VALID_TXN_TYPES } = require('../services/SupplierService');

const supplierCreateRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('address').optional({ checkFalsy: true }).trim(),
  body('openingBalance').optional().isFloat({ min: 0 }).withMessage('openingBalance must be a non-negative number.')
];

const supplierUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('address').optional({ checkFalsy: true }).trim()
];

const supplierTransactionRules = [
  body('supplierId').trim().notEmpty().withMessage('supplierId is required.'),
  body('type').isIn(VALID_TXN_TYPES).withMessage(`type must be one of: ${VALID_TXN_TYPES.join(', ')}`),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number.'),
  body('note').optional().trim()
];

module.exports = { supplierCreateRules, supplierUpdateRules, supplierTransactionRules };
