const express = require('express');
const router = express.Router();
const controller = require('../controllers/opd.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

// Doctor Schedules
router.post('/schedules', authorize('Admin', 'Doctor', 'Manager'), controller.createSchedule);
router.get('/schedules', controller.listSchedules);

// OPD Appointments & Token Queue
router.post('/appointments', authorize('Receptionist', 'Doctor', 'Nurse', 'Admin'), controller.createAppointment);
router.get('/queue/:doctorId', controller.getDoctorQueue);
router.get('/appointments/:id', controller.getAppointment);
router.patch('/appointments/:id/vitals', authorize('Nurse', 'Doctor', 'Receptionist', 'Admin'), controller.updateVitals);
router.patch('/appointments/:id/status', authorize('Doctor', 'Nurse', 'Receptionist', 'Admin'), controller.updateStatus);

module.exports = router;
