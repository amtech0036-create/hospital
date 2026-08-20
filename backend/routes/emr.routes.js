const express = require('express');
const router = express.Router();
const controller = require('../controllers/emr.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

// Prescriptions & EMR Timeline
router.post('/prescriptions', authorize('Doctor', 'Admin'), controller.createPrescription);
router.get('/prescriptions/:prescriptionNumber', controller.getPrescription);
router.get('/patients/:uhid/emr-timeline', controller.getEmrTimeline);

module.exports = router;
