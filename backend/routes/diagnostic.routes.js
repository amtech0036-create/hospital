const express = require('express');
const router = express.Router();

const controller = require('../controllers/diagnostic.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

// Public Unauthenticated Token-Secured Report Portal Link
router.get('/portal/reports/:token', controller.getPublicPortalReport);

// All other diagnostic routes require authentication and are multi-tenant scoped via tenantResolverMiddleware
router.use(authenticate);

// 1. Create Patient Billing & Order
router.post(
  '/orders',
  authorize('Admin', 'Manager', 'Receptionist', 'Doctor'),
  controller.createOrder
);

router.get(
  '/orders',
  authorize('Admin', 'Manager', 'Receptionist', 'Doctor', 'Accountant'),
  controller.getOrders
);

// 2. Unified Barcode Lookup (Invoice Barcode or Specimen Barcode)
router.get(
  '/scan/:barcode',
  authorize('Admin', 'Manager', 'Receptionist', 'Phlebotomist', 'Lab_Technician', 'Radiologist', 'Pathologist', 'Doctor'),
  controller.scanBarcode
);

// 3. Phlebotomy Sample Collection
router.patch(
  '/sample-collect',
  authorize('Admin', 'Manager', 'Phlebotomist', 'Lab_Technician'),
  controller.sampleCollect
);

// 4. LIS Parameter Entry & RIS Narrative Report Save
router.post(
  '/results/save',
  authorize('Admin', 'Manager', 'Lab_Technician', 'Radiologist', 'Pathologist'),
  controller.saveResults
);

// 5. Digital Verification & Result Authorization
router.patch(
  '/results/authorize',
  authorize('Admin', 'Manager', 'Pathologist', 'Radiologist', 'Doctor'),
  controller.authorizeResult
);

// 6. PDF Report Print Data Generation
router.get(
  '/reports/:orderId/print',
  authorize('Admin', 'Manager', 'Receptionist', 'Lab_Technician', 'Radiologist', 'Pathologist', 'Doctor'),
  controller.getReportPrintData
);

// 7. Doctor Referral Commissions Ledger
router.get(
  '/commissions',
  authorize('Admin', 'Manager', 'Accountant', 'Doctor'),
  controller.getDoctorCommissions
);

router.post(
  '/commissions/:id/payout',
  authorize('Admin', 'Manager', 'Accountant'),
  controller.processDoctorPayout
);

// 8. Modality & Diagnostic Analytics Dashboard
router.get(
  '/analytics',
  authorize('Admin', 'Manager', 'Accountant', 'Doctor', 'Pathologist', 'Radiologist'),
  controller.getAnalyticsDashboard
);

// 9. Diagnostic Test Catalog Master CRUD
router.get('/tests', controller.listTests);
router.post('/tests', authorize('Admin', 'Manager'), controller.createTest);
router.put('/tests/:id', authorize('Admin', 'Manager'), controller.updateTest);
router.delete('/tests/:id', authorize('Admin', 'Manager'), controller.deleteTest);

// 10. Shift Closing Daily Cash Collection Summary
router.get('/shift-summary', authorize('Admin', 'Manager', 'Receptionist', 'Accountant'), controller.getShiftSummary);

module.exports = router;
