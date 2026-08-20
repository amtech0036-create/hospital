const express = require('express');
const router = express.Router();

const controller = require('../controllers/doctor.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('Admin', 'Manager', 'Receptionist'), controller.create);
router.put('/:id', authorize('Admin', 'Manager'), controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
