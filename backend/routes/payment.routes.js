const express = require('express');
const router = express.Router();

const controller = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { paymentCreateRules } = require('../validators/payment.validator');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager', 'Accountant'), paymentCreateRules, validate, controller.create);

module.exports = router;
