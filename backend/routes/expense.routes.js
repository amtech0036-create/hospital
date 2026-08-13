const express = require('express');
const router = express.Router();

const controller = require('../controllers/expense.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { expenseCreateRules } = require('../validators/expense.validator');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager', 'Accountant'), expenseCreateRules, validate, controller.create);

module.exports = router;
