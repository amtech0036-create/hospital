const express = require('express');
const router = express.Router();
const controller = require('../controllers/unifiedBilling.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

// Consolidated Unified Hospital Billing & Ledger
router.post('/final-invoice', authorize('Cashier', 'Accountant', 'Admin', 'Manager'), controller.generateFinalInvoice);
router.get('/ledger/:uhid', controller.getPatientLedger);

module.exports = router;
