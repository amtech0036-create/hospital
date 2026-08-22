const express = require('express');
const router = express.Router();
const controller = require('../controllers/ipd.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

// Bed Master & Matrix Dashboard
router.get('/beds/matrix', controller.getBedMatrix);
router.post('/beds', authorize('Admin', 'Manager'), controller.createBed);
router.get('/beds', controller.listBeds);
router.patch('/beds/:id/status', authorize('Admin', 'Manager', 'Nurse', 'Receptionist', 'Doctor'), controller.updateBedStatus);

// Admissions & Discharges
router.post('/admissions', authorize('Receptionist', 'Nurse', 'Admin', 'Manager'), controller.admitPatient);
router.post('/admissions/:id/discharge', authorize('Doctor', 'Admin', 'Manager'), controller.dischargePatient);

module.exports = router;
