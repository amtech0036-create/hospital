const express = require('express');
const router = express.Router();
const controller = require('../controllers/supportingDepts.controller');

// Expose endpoints for each Phase 3 department
router.get('/physiotherapy', controller.listPhysio);
router.post('/physiotherapy', controller.createPhysio);

router.get('/dental', controller.listDental);
router.post('/dental', controller.createDental);

router.get('/dietetics', controller.listDiet);
router.post('/dietetics', controller.createDiet);

router.get('/mortuary', controller.listMortuary);
router.post('/mortuary', controller.createMortuary);

router.get('/biomedical', controller.listBiomedical);
router.post('/biomedical', controller.createBiomedical);

module.exports = router;
