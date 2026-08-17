const express = require('express');
const router = express.Router();

const controller = require('../controllers/employee.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { employeeCreateRules, employeeUpdateRules } = require('../validators/employee.validator');

router.use(authenticate, authorize('Admin', 'Manager', 'HR'));

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager'), employeeCreateRules, validate, controller.create);
router.put('/:id', authorize('Admin', 'Manager'), employeeUpdateRules, validate, controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);
router.delete('/:id/permanent', authorize('Admin'), controller.removePermanent);

module.exports = router;
