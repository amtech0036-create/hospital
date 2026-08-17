const express = require('express');
const router = express.Router();

const controller = require('../controllers/attendance.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', controller.list);
router.post('/auto-process-absences', authorize('Admin', 'Manager'), controller.autoProcessAbsences);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager', 'Accountant'), controller.record);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
