const DiagnosticService = require('../services/DiagnosticService');
const DoctorCommissionService = require('../services/DoctorCommissionService');
const ReportDeliveryService = require('../services/ReportDeliveryService');
const DiagnosticAnalyticsService = require('../services/DiagnosticAnalyticsService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const createOrder = asyncHandler(async (req, res) => {
  const createdBy = req.user?.email || req.user?.id || 'system';
  const result = await DiagnosticService.createOrder(req.body, { createdBy });

  // Auto-calculate referring doctor commission
  if (result.order) {
    await DoctorCommissionService.calculateAndRecordCommission(result.order);
  }

  return success(res, {
    message: 'Diagnostic order created successfully with barcode and commission.',
    data: result,
    status: 201
  });
});

const scanBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  const data = await DiagnosticService.scanBarcode(barcode);
  return success(res, {
    message: 'Barcode scanned successfully.',
    data
  });
});

const sampleCollect = asyncHandler(async (req, res) => {
  const phlebotomistId = req.user?.email || req.user?.id || req.body.phlebotomistId;
  const data = await DiagnosticService.collectSample({
    ...req.body,
    phlebotomistId
  });
  return success(res, {
    message: 'Sample collected successfully.',
    data
  });
});

const saveResults = asyncHandler(async (req, res) => {
  const enteredBy = req.user?.email || req.user?.role || req.body.enteredBy;
  const data = await DiagnosticService.saveResults({
    ...req.body,
    enteredBy
  });
  return success(res, {
    message: 'Diagnostic results saved successfully.',
    data
  });
});

const authorizeResult = asyncHandler(async (req, res) => {
  const authorizedBy = req.user?.email || req.user?.role || req.body.authorizedBy;
  const data = await DiagnosticService.authorizeResult({
    ...req.body,
    authorizedBy
  });

  // Trigger automated SMS / WhatsApp gateway notification with portal token
  if (data.order || data.orderId) {
    await ReportDeliveryService.triggerReportReadyNotification(data.order || data.orderId, req.tenantId);
  }

  return success(res, {
    message: 'Diagnostic result digitally authorized and report notification triggered.',
    data
  });
});

const getReportPrintData = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const data = await DiagnosticService.getReportPrintData(orderId);
  return success(res, {
    message: 'Diagnostic report print data fetched successfully.',
    data
  });
});

// --- Phase 7 New Controllers ---

const getDoctorCommissions = asyncHandler(async (req, res) => {
  const { doctorName, payoutStatus } = req.query;
  const data = await DoctorCommissionService.getCommissions({ doctorName, payoutStatus });
  return success(res, {
    message: 'Doctor commission ledger fetched.',
    data
  });
});

const processDoctorPayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentReference } = req.body;
  const data = await DoctorCommissionService.processPayout(id, { paymentReference });
  return success(res, {
    message: 'Doctor commission payout processed.',
    data
  });
});

const getPublicPortalReport = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const data = await ReportDeliveryService.getReportByPortalToken(token);
  return success(res, {
    message: 'Public report portal data loaded successfully.',
    data
  });
});

const getAnalyticsDashboard = asyncHandler(async (req, res) => {
  const data = await DiagnosticAnalyticsService.getAnalyticsDashboard();
  return success(res, {
    message: 'Diagnostic analytics metrics loaded.',
    data
  });
});

const listTests = asyncHandler(async (req, res) => {
  const tests = await DiagnosticService.listTests(req.query);
  return success(res, { message: 'Diagnostic test catalog loaded.', data: tests });
});

const createTest = asyncHandler(async (req, res) => {
  const test = await DiagnosticService.createTest(req.body);
  return success(res, { message: 'Diagnostic test created.', data: test, status: 201 });
});

const updateTest = asyncHandler(async (req, res) => {
  const test = await DiagnosticService.updateTest(req.params.id, req.body);
  return success(res, { message: 'Diagnostic test updated.', data: test });
});

const deleteTest = asyncHandler(async (req, res) => {
  await DiagnosticService.deleteTest(req.params.id);
  return success(res, { message: 'Diagnostic test deactivated.' });
});

const getShiftSummary = asyncHandler(async (req, res) => {
  const data = await DiagnosticService.getShiftSummary(req.query);
  return success(res, { message: 'Shift closing collection report generated.', data });
});

module.exports = {
  createOrder,
  scanBarcode,
  sampleCollect,
  saveResults,
  authorizeResult,
  getReportPrintData,
  getDoctorCommissions,
  processDoctorPayout,
  getPublicPortalReport,
  getAnalyticsDashboard,
  listTests,
  createTest,
  updateTest,
  deleteTest,
  getShiftSummary
};
