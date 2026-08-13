const PurchaseService = require('../services/PurchaseService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { supplierId, status, from, to } = req.query;
  const purchases = await PurchaseService.list({ supplierId, status, from, to });
  return success(res, { message: 'Purchase list.', data: purchases });
});

const getOne = asyncHandler(async (req, res) => {
  const purchase = await PurchaseService.getById(req.params.id);
  return success(res, { message: 'Purchase detail.', data: purchase });
});

const create = asyncHandler(async (req, res) => {
  const purchase = await PurchaseService.create(req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Purchase recorded.', data: purchase, status: 201 });
});

const cancel = asyncHandler(async (req, res) => {
  const purchase = await PurchaseService.cancel(req.params.id, { createdBy: req.user?.email });
  return success(res, { message: 'Purchase cancelled.', data: purchase });
});

const createReturn = asyncHandler(async (req, res) => {
  const purchaseReturn = await PurchaseService.createReturn(req.params.id, req.body, {
    createdBy: req.user?.email
  });
  return success(res, { message: 'Purchase return recorded.', data: purchaseReturn, status: 201 });
});

const listReturns = asyncHandler(async (req, res) => {
  const returns = await PurchaseService.listReturns(req.params.id);
  return success(res, { message: 'Purchase returns.', data: returns });
});

module.exports = { list, getOne, create, cancel, createReturn, listReturns };
