const PaymentService = require('../services/PaymentService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { partyType, partyId, from, to } = req.query;
  const payments = await PaymentService.list({ partyType, partyId, from, to });
  return success(res, { message: 'Payment list.', data: payments });
});

const getOne = asyncHandler(async (req, res) => {
  const payment = await PaymentService.getById(req.params.id);
  return success(res, { message: 'Payment detail.', data: payment });
});

const create = asyncHandler(async (req, res) => {
  const payment = await PaymentService.create(req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Payment recorded.', data: payment, status: 201 });
});

module.exports = { list, getOne, create };
