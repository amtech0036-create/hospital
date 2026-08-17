const express = require('express');
const router = express.Router();

const controller = require('../controllers/advance.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/deduction/:employeeId', controller.getDeduction);
router.post('/', authorize('Admin', 'Manager', 'Accountant'), controller.create);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
