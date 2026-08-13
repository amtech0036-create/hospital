const express = require('express');
const router = express.Router();

const controller = require('../controllers/purchase.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { purchaseCreateRules, purchaseReturnRules } = require('../validators/purchase.validator');

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('Admin', 'Manager', 'Accountant'), purchaseCreateRules, validate, controller.create);
router.post('/:id/cancel', authorize('Admin', 'Manager'), controller.cancel);
router.post('/:id/return', authorize('Admin', 'Manager', 'Accountant'), purchaseReturnRules, validate, controller.createReturn);
router.get('/:id/returns', controller.listReturns);
router.get('/:id', controller.getOne);

module.exports = router;
