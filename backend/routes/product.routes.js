const express = require('express');
const router = express.Router();

const controller = require('../controllers/product.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { productCreateRules, productUpdateRules, bulkMarkupRules } = require('../validators/product.validator');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/price-history', controller.priceHistory);

router.post('/', authorize('Admin', 'Manager'), productCreateRules, validate, controller.create);
router.put('/:id', authorize('Admin', 'Manager'), productUpdateRules, validate, controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);
router.delete('/:id/permanent', authorize('Admin'), controller.removePermanent);

router.post('/bulk-markup/preview', authorize('Admin', 'Manager'), bulkMarkupRules, validate, controller.previewBulkMarkup);
router.post('/bulk-markup/apply', authorize('Admin', 'Manager'), bulkMarkupRules, validate, controller.applyBulkMarkup);

module.exports = router;
