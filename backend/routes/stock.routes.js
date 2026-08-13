const express = require('express');
const router = express.Router();

const controller = require('../controllers/stock.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { stockTransactionRules } = require('../validators/stock.validator');

router.use(authenticate);

router.get('/low-stock', controller.lowStockProducts);
router.get('/:productId/history', controller.historyForProduct);
router.get('/:productId/current', controller.currentStock);
router.post('/', authorize('Admin', 'Manager'), stockTransactionRules, validate, controller.recordTransaction);

module.exports = router;
