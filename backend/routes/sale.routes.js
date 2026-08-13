const express = require('express');
const router = express.Router();

const controller = require('../controllers/sale.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { saleCreateRules, saleReturnRules } = require('../validators/sale.validator');

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('Admin', 'Manager', 'Sales User'), saleCreateRules, validate, controller.create);
router.post('/:id/cancel', authorize('Admin', 'Manager'), controller.cancel);
router.post('/:id/return', authorize('Admin', 'Manager', 'Sales User'), saleReturnRules, validate, controller.createReturn);
router.get('/:id/returns', controller.listReturns);
router.get('/:id', controller.getOne);

module.exports = router;
