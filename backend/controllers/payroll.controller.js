const PayrollService = require('../services/PayrollService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { employeeId, payMonth, status, from, to } = req.query;
  const records = await PayrollService.list({ employeeId, payMonth, status, from, to });
  return success(res, { message: 'Payroll list.', data: records });
});

const getOne = asyncHandler(async (req, res) => {
  const record = await PayrollService.getById(req.params.id);
  return success(res, { message: 'Payroll detail.', data: record });
});

const create = asyncHandler(async (req, res) => {
  const record = await PayrollService.create(req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Salary processed.', data: record, status: 201 });
});

const createBulk = asyncHandler(async (req, res) => {
  const result = await PayrollService.createBulk(req.body, { createdBy: req.user?.email });
  return success(res, { message: 'Bulk payroll processed.', data: result, status: 201 });
});

module.exports = { list, getOne, create, createBulk };
