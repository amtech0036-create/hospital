const express = require('express');
const router = express.Router();

const controller = require('../controllers/customer.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { customerCreateRules, customerUpdateRules, customerTransactionRules } = require('../validators/customer.validator');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/transactions', controller.transactionHistory);
router.get('/:id/balance', controller.balance);

// Sales staff need to be able to add customers on the fly while selling.
router.post('/', authorize('Admin', 'Manager', 'Sales User'), customerCreateRules, validate, controller.create);
router.put('/:id', authorize('Admin', 'Manager', 'Sales User'), customerUpdateRules, validate, controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);
router.delete('/:id/permanent', authorize('Admin'), controller.removePermanent);

// Manual ledger entries (e.g. recording a payment received) — accounts-facing roles only.
router.post('/transactions', authorize('Admin', 'Manager', 'Accountant'), customerTransactionRules, validate, controller.recordTransaction);

module.exports = router;
