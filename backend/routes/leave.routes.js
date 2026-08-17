const express = require('express');
const router = express.Router();

const controller = require('../controllers/leave.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id/status', authorize('Admin', 'Manager'), controller.updateStatus);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
