const express = require('express');
const router = express.Router();
const controller = require('../controllers/bloodBank.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

// Blood Bank Master & Inventory
router.post('/units', authorize('LabTechnician', 'Nurse', 'Admin', 'Manager'), controller.registerBloodUnit);
router.get('/inventory', controller.getBloodInventory);
router.patch('/units/:id/status', authorize('LabTechnician', 'Nurse', 'Doctor', 'Admin', 'Manager'), controller.updateBloodUnitStatus);

module.exports = router;
