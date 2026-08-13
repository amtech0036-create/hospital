const { body } = require('express-validator');
const { SETTING_KEYS } = require('../services/SettingsService');
const { ROLES } = require('../validators/auth.validator');

const settingsUpdateRules = SETTING_KEYS.map((key) => body(key).optional().trim());

const userCreateRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`)
];

const userUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('email').optional().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').optional().isIn(ROLES),
  body('status').optional().isIn(['Active', 'Inactive'])
];

module.exports = { settingsUpdateRules, userCreateRules, userUpdateRules };
