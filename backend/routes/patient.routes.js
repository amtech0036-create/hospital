const express = require('express');
const router = express.Router();

const controller = require('../controllers/patient.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager', 'Receptionist', 'Doctor'), controller.create);
router.put('/:id', authorize('Admin', 'Manager', 'Receptionist'), controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
