const DepartmentService = require('../services/DepartmentService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const departments = await DepartmentService.list(req.query);
  return success(res, { message: 'Department list.', data: departments });
});

const getOne = asyncHandler(async (req, res) => {
  const department = await DepartmentService.getById(req.params.id);
  return success(res, { message: 'Department detail.', data: department });
});

const create = asyncHandler(async (req, res) => {
  const department = await DepartmentService.create(req.body);
  return success(res, { message: 'Department created.', data: department, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const department = await DepartmentService.update(req.params.id, req.body);
  return success(res, { message: 'Department updated.', data: department });
});

const remove = asyncHandler(async (req, res) => {
  await DepartmentService.remove(req.params.id);
  return success(res, { message: 'Department deactivated.' });
});

module.exports = { list, getOne, create, update, remove };
