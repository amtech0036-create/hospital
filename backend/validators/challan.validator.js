const { body } = require('express-validator');

const challanCreateRules = [
  body('customerId').trim().notEmpty().withMessage('customerId is required.'),
  body('saleId').optional({ checkFalsy: true }).trim(),
  body('challanDate').optional().isISO8601().withMessage('challanDate must be a valid ISO date.'),
  body('note').optional().trim(),
  body('deductStock').optional().isBoolean().withMessage('deductStock must be boolean.'),
  body('items').optional().isArray().withMessage('items must be an array.'),
  body('items.*.productId').optional().trim().notEmpty(),
  body('items.*.quantity').optional().isFloat({ gt: 0 })
];

module.exports = { challanCreateRules };
