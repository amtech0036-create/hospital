const SaleService = require('../services/SaleService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { customerId, status, from, to } = req.query;
  const sales = await SaleService.list({ customerId, status, from, to });
  return success(res, { message: 'Sale list.', data: sales });
});

const getOne = asyncHandler(async (req, res) => {
  const sale = await SaleService.getById(req.params.id);
  return success(res, { message: 'Sale detail.', data: sale });
});

const create = asyncHandler(async (req, res) => {
  const sale = await SaleService.create(req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Sale recorded.', data: sale, status: 201 });
});

const cancel = asyncHandler(async (req, res) => {
  const sale = await SaleService.cancel(req.params.id, { createdBy: req.user?.email });
  return success(res, { message: 'Sale cancelled.', data: sale });
});

const createReturn = asyncHandler(async (req, res) => {
  const saleReturn = await SaleService.createReturn(req.params.id, req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Sale return recorded.', data: saleReturn, status: 201 });
});

const listReturns = asyncHandler(async (req, res) => {
  const returns = await SaleService.listReturns(req.params.id);
  return success(res, { message: 'Sale returns.', data: returns });
});

module.exports = { list, getOne, create, cancel, createReturn, listReturns };
