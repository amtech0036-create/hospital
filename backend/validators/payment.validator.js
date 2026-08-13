const { body } = require('express-validator');
const { PARTY_TYPES, DIRECTIONS, PAYMENT_METHODS } = require('../services/PaymentService');

const paymentCreateRules = [
  body('partyType').isIn(PARTY_TYPES).withMessage(`partyType must be one of: ${PARTY_TYPES.join(', ')}`),
  body('partyId').trim().notEmpty().withMessage('partyId is required.'),
  body('direction').isIn(DIRECTIONS).withMessage(`direction must be one of: ${DIRECTIONS.join(', ')}`),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number.'),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS),
  body('paymentDate').optional().isISO8601(),
  body('referenceType').optional().trim(),
  body('referenceId').optional().trim(),
  body('note').optional().trim()
];

module.exports = { paymentCreateRules };
