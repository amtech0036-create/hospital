const { body } = require('express-validator');
const { PAYMENT_METHODS } = require('../services/SaleService');

const saleCreateRules = [
  body('customerId').trim().notEmpty().withMessage('customerId is required.'),
  body('saleDate').optional().isISO8601().withMessage('saleDate must be a valid ISO date.'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('discount must be non-negative.'),
  body('amountPaid').optional().isFloat({ min: 0 }).withMessage('amountPaid must be non-negative.'),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS).withMessage(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`),
  body('note').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array.'),
  body('items.*.productId').trim().notEmpty().withMessage('Each item needs a productId.'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Each item quantity must be positive.'),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('unitPrice must be non-negative.')
];

const saleReturnRules = [
  body('returnDate').optional().isISO8601(),
  body('note').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array.'),
  body('items.*.productId').trim().notEmpty().withMessage('Each item needs a productId.'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Each return quantity must be positive.')
];

module.exports = { saleCreateRules, saleReturnRules };
