const UnifiedBillingService = require('../services/UnifiedBillingService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const generateFinalInvoice = asyncHandler(async (req, res) => {
  const invoiceData = await UnifiedBillingService.generateFinalInvoice(req.body);
  return success(res, { message: 'Unified Hospital Final Invoice generated successfully.', data: invoiceData, status: 201 });
});

const getPatientLedger = asyncHandler(async (req, res) => {
  const { uhid } = req.params;
  const ledgerData = await UnifiedBillingService.getPatientLedger(uhid);
  return success(res, { message: 'Patient ledger loaded.', data: ledgerData });
});

module.exports = {
  generateFinalInvoice,
  getPatientLedger
};
