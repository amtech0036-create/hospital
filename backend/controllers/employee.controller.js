const EmployeeService = require('../services/EmployeeService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const employees = await EmployeeService.list({ status, search });
  return success(res, { message: 'Employee list.', data: employees });
});

const getOne = asyncHandler(async (req, res) => {
  const employee = await EmployeeService.getById(req.params.id);
  return success(res, { message: 'Employee detail.', data: employee });
});

const create = asyncHandler(async (req, res) => {
  const employee = await EmployeeService.create(req.body);
  return success(res, { message: 'Employee created.', data: employee, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const employee = await EmployeeService.update(req.params.id, req.body);
  return success(res, { message: 'Employee updated.', data: employee });
});

const remove = asyncHandler(async (req, res) => {
  await EmployeeService.remove(req.params.id);
  return success(res, { message: 'Employee deactivated.' });
});

const removePermanent = asyncHandler(async (req, res) => {
  await EmployeeService.remove(req.params.id, { hard: true });
  return success(res, { message: 'Employee permanently deleted.' });
});

module.exports = { list, getOne, create, update, remove, removePermanent };
