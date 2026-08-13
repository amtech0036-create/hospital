const { body } = require('express-validator');

const ROLES = ['Admin', 'Manager', 'Sales User', 'Accountant', 'HR'];

const loginRules = [
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
];

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`)
];

module.exports = { loginRules, registerRules, ROLES };
