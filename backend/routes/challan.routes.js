const express = require('express');
const router = express.Router();

const controller = require('../controllers/challan.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { challanCreateRules } = require('../validators/challan.validator');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager', 'Sales User'), challanCreateRules, validate, controller.create);
router.post('/:id/cancel', authorize('Admin', 'Manager'), controller.cancel);

module.exports = router;
