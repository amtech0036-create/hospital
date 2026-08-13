const { body } = require('express-validator');
const { VALID_TYPES } = require('../services/StockService');

const stockTransactionRules = [
  body('productId').trim().notEmpty().withMessage('productId is required.'),
  body('type').isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
  body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be a positive number.'),
  body('note').optional().trim()
];

module.exports = { stockTransactionRules };
