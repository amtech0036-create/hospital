const { body } = require('express-validator');

const employeeCreateRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('address').optional({ checkFalsy: true }).trim(),
  body('departmentId').optional({ checkFalsy: true }).trim(),
  body('departmentName').optional({ checkFalsy: true }).trim(),
  body('designation').optional({ checkFalsy: true }).trim(),
  body('joinDate').optional().isISO8601(),
  body('salary').optional().isFloat({ min: 0 }).withMessage('salary must be a non-negative number.'),
  body('note').optional({ checkFalsy: true }).trim()
];

const employeeUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('address').optional({ checkFalsy: true }).trim(),
  body('departmentId').optional({ checkFalsy: true }).trim(),
  body('departmentName').optional({ checkFalsy: true }).trim(),
  body('designation').optional({ checkFalsy: true }).trim(),
  body('joinDate').optional().isISO8601(),
  body('salary').optional().isFloat({ min: 0 }).withMessage('salary must be a non-negative number.'),
  body('note').optional({ checkFalsy: true }).trim(),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('status must be Active or Inactive.')
];

module.exports = { employeeCreateRules, employeeUpdateRules };
