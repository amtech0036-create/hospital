const ExpenseService = require('../services/ExpenseService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { category, from, to } = req.query;
  const expenses = await ExpenseService.list({ category, from, to });
  return success(res, { message: 'Expense list.', data: expenses });
});

const getOne = asyncHandler(async (req, res) => {
  const expense = await ExpenseService.getById(req.params.id);
  return success(res, { message: 'Expense detail.', data: expense });
});

const create = asyncHandler(async (req, res) => {
  const expense = await ExpenseService.create(req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Expense recorded.', data: expense, status: 201 });
});

module.exports = { list, getOne, create };
