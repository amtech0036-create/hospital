const express = require('express');
const router = express.Router();

const controller = require('../controllers/brand.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { lookupCreateRules, lookupUpdateRules } = require('../validators/lookup.validator');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager'), lookupCreateRules, validate, controller.create);
router.put('/:id', authorize('Admin', 'Manager'), lookupUpdateRules, validate, controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
