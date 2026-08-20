const express = require('express');
const router = express.Router();
const controller = require('../controllers/pharmacy.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

// Pharmacy Batch & Expiry FEFO Sales
router.get('/prescriptions/:prescriptionNumber', controller.getPrescriptionCart);
router.post('/sales', authorize('Pharmacist', 'Cashier', 'Admin', 'Manager'), controller.processPharmacySale);

module.exports = router;
