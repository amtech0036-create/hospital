const { body } = require('express-validator');

const lookupCreateRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('description').optional().trim()
];

const lookupUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive.')
];

module.exports = { lookupCreateRules, lookupUpdateRules };
