const SupplierService = require('../services/SupplierService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const suppliers = await SupplierService.list({ status, search });
  return success(res, { message: 'Supplier list.', data: suppliers });
});

const getOne = asyncHandler(async (req, res) => {
  const supplier = await SupplierService.getById(req.params.id);
  return success(res, { message: 'Supplier detail.', data: supplier });
});

const create = asyncHandler(async (req, res) => {
  const supplier = await SupplierService.create(req.body);
  return success(res, { message: 'Supplier created.', data: supplier, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const supplier = await SupplierService.update(req.params.id, req.body);
  return success(res, { message: 'Supplier updated.', data: supplier });
});

const remove = asyncHandler(async (req, res) => {
  await SupplierService.remove(req.params.id);
  return success(res, { message: 'Supplier deactivated.' });
});

const removePermanent = asyncHandler(async (req, res) => {
  await SupplierService.remove(req.params.id, { hard: true });
  return success(res, { message: 'Supplier permanently deleted.' });
});

const recordTransaction = asyncHandler(async (req, res) => {
  const txn = await SupplierService.recordTransaction({
    ...req.body,
    createdBy: req.user?.email
  });
  return success(res, { message: 'Supplier transaction recorded.', data: txn, status: 201 });
});

const transactionHistory = asyncHandler(async (req, res) => {
  const history = await SupplierService.transactionHistory(req.params.id);
  return success(res, { message: 'Supplier transaction history.', data: history });
});

const balance = asyncHandler(async (req, res) => {
  const balanceDue = await SupplierService.balance(req.params.id);
  return success(res, { message: 'Supplier balance.', data: { supplierId: req.params.id, balanceDue } });
});

module.exports = { list, getOne, create, update, remove, removePermanent, recordTransaction, transactionHistory, balance };
