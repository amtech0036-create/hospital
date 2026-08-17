const express = require('express');
const router = express.Router();

const controller = require('../controllers/payroll.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate, authorize('Admin', 'Manager', 'HR', 'Accountant'));

router.get('/', controller.list);
router.get('/dashboard-stats', controller.dashboardStats);
router.post('/bulk', authorize('Admin', 'Manager', 'Accountant'), controller.createBulk);
router.get('/:id', controller.getOne);
router.post('/', authorize('Admin', 'Manager', 'Accountant'), controller.create);
router.put('/:id', authorize('Admin', 'Manager', 'Accountant'), controller.update);
router.delete('/:id', authorize('Admin', 'Manager'), controller.remove);

module.exports = router;
