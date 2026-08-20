const express = require('express');
const router = express.Router();
const controller = require('../controllers/hospitalStore.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

// Departmental Store Stock Requisitions
router.post('/requisitions', authorize('Pharmacist', 'LabTechnician', 'Nurse', 'Admin', 'Manager'), controller.createRequisition);
router.patch('/requisitions/:id/approve', authorize('Admin', 'Manager'), controller.approveRequisition);
router.get('/requisitions', controller.listRequisitions);

module.exports = router;
