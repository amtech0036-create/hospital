const ChallanService = require('../services/ChallanService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { customerId, saleId, status } = req.query;
  const challans = await ChallanService.list({ customerId, saleId, status });
  return success(res, { message: 'Challan list.', data: challans });
});

const getOne = asyncHandler(async (req, res) => {
  const challan = await ChallanService.getById(req.params.id);
  return success(res, { message: 'Challan detail.', data: challan });
});

const create = asyncHandler(async (req, res) => {
  const challan = await ChallanService.create(req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Challan created.', data: challan, status: 201 });
});

const cancel = asyncHandler(async (req, res) => {
  const challan = await ChallanService.cancel(req.params.id, { createdBy: req.user?.email });
  return success(res, { message: 'Challan cancelled.', data: challan });
});

module.exports = { list, getOne, create, cancel };
