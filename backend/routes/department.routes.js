const express = require('express');
const router = express.Router();

const controller = require('../controllers/department.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager'), controller.create);
router.put('/:id', authorize('Admin', 'Manager'), controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
