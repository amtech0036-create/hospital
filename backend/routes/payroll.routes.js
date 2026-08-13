const express = require('express');
const router = express.Router();

const controller = require('../controllers/payroll.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { payrollCreateRules, payrollBulkRules } = require('../validators/payroll.validator');

router.use(authenticate);

router.get('/', controller.list);
router.post('/bulk', authorize('Admin', 'Manager', 'Accountant'), payrollBulkRules, validate, controller.createBulk);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager', 'Accountant'), payrollCreateRules, validate, controller.create);

module.exports = router;
