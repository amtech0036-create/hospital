const CustomerService = require('../services/CustomerService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const customers = await CustomerService.list({ status, search });
  return success(res, { message: 'Customer list.', data: customers });
});

const getOne = asyncHandler(async (req, res) => {
  const customer = await CustomerService.getById(req.params.id);
  return success(res, { message: 'Customer detail.', data: customer });
});

const create = asyncHandler(async (req, res) => {
  const customer = await CustomerService.create(req.body);
  return success(res, { message: 'Customer created.', data: customer, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const customer = await CustomerService.update(req.params.id, req.body);
  return success(res, { message: 'Customer updated.', data: customer });
});

const remove = asyncHandler(async (req, res) => {
  await CustomerService.remove(req.params.id);
  return success(res, { message: 'Customer deactivated.' });
});

const removePermanent = asyncHandler(async (req, res) => {
  await CustomerService.remove(req.params.id, { hard: true });
  return success(res, { message: 'Customer permanently deleted.' });
});

const recordTransaction = asyncHandler(async (req, res) => {
  const txn = await CustomerService.recordTransaction({
    ...req.body,
    createdBy: req.user?.email
  });
  return success(res, { message: 'Customer transaction recorded.', data: txn, status: 201 });
});

const transactionHistory = asyncHandler(async (req, res) => {
  const history = await CustomerService.transactionHistory(req.params.id);
  return success(res, { message: 'Customer transaction history.', data: history });
});

const balance = asyncHandler(async (req, res) => {
  const balanceDue = await CustomerService.balance(req.params.id);
  return success(res, { message: 'Customer balance.', data: { customerId: req.params.id, balanceDue } });
});

module.exports = { list, getOne, create, update, remove, removePermanent, recordTransaction, transactionHistory, balance };
