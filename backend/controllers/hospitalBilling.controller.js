const HospitalBillingService = require('../services/HospitalBillingService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await HospitalBillingService.list(req.query);
  return success(res, { message: 'Hospital billing invoices loaded.', data: result.invoices, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await HospitalBillingService.create(req.body);
  return success(res, { message: 'Central hospital invoice generated.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await HospitalBillingService.update(req.params.id, req.body);
  return success(res, { message: 'Invoice payment & due status updated.', data: item });
});

module.exports = { list, create, update };
