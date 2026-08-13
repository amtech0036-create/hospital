const express = require('express');
const router = express.Router();

const controller = require('../controllers/supplier.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { supplierCreateRules, supplierUpdateRules, supplierTransactionRules } = require('../validators/supplier.validator');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/transactions', controller.transactionHistory);
router.get('/:id/balance', controller.balance);

router.post('/', authorize('Admin', 'Manager', 'Accountant'), supplierCreateRules, validate, controller.create);
router.put('/:id', authorize('Admin', 'Manager', 'Accountant'), supplierUpdateRules, validate, controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);
router.delete('/:id/permanent', authorize('Admin'), controller.removePermanent);

// Manual ledger entries (e.g. recording a payment made) — accounts-facing roles only.
router.post('/transactions', authorize('Admin', 'Manager', 'Accountant'), supplierTransactionRules, validate, controller.recordTransaction);

module.exports = router;
