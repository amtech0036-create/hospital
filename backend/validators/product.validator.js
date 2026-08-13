const { body } = require('express-validator');
const { PRICING_METHODS } = require('../services/pricingEngine');

const productCreateRules = [
  body('name').trim().notEmpty().withMessage('Product name is required.'),
  body('sku').optional().trim(),
  body('purchasePrice').isFloat({ min: 0 }).withMessage('Purchase price must be a non-negative number.'),
  body('pricingMethod')
    .optional()
    .isIn(Object.values(PRICING_METHODS))
    .withMessage(`Pricing method must be one of: ${Object.values(PRICING_METHODS).join(', ')}`),
  body('markupPercentage').optional().isFloat({ min: 0 }).withMessage('Markup percentage must be a non-negative number.'),
  body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('Selling price must be a non-negative number.'),
  body('minimumStock').optional().isFloat({ min: 0 }).withMessage('Minimum stock must be a non-negative number.'),
  body('openingStock').optional().isFloat({ min: 0 }).withMessage('Opening stock must be a non-negative number.')
];

const productUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty.'),
  body('purchasePrice').optional().isFloat({ min: 0 }).withMessage('Purchase price must be a non-negative number.'),
  body('pricingMethod')
    .optional()
    .isIn(Object.values(PRICING_METHODS))
    .withMessage(`Pricing method must be one of: ${Object.values(PRICING_METHODS).join(', ')}`),
  body('markupPercentage').optional().isFloat({ min: 0 }).withMessage('Markup percentage must be a non-negative number.'),
  body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('Selling price must be a non-negative number.'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive.')
];

const bulkMarkupRules = [
  body('newMarkupPercentage').isFloat({ min: 0 }).withMessage('newMarkupPercentage must be a non-negative number.'),
  body('categoryId').optional().trim(),
  body('brandId').optional().trim(),
  body('productIds').optional().isArray().withMessage('productIds must be an array.')
];

module.exports = { productCreateRules, productUpdateRules, bulkMarkupRules };
