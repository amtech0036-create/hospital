const EmergencyService = require('../services/EmergencyService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await EmergencyService.list(req.query);
  return success(res, { message: 'Emergency queue loaded.', data: result.emergencies, meta: result.pagination });
});

const getOne = asyncHandler(async (req, res) => {
  const item = await EmergencyService.getById(req.params.id);
  return success(res, { message: 'Emergency details loaded.', data: item });
});

const create = asyncHandler(async (req, res) => {
  const item = await EmergencyService.create(req.body);
  return success(res, { message: 'Emergency patient registered & triaged.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await EmergencyService.update(req.params.id, req.body);
  return success(res, { message: 'Emergency record updated.', data: item });
});

module.exports = { list, getOne, create, update };
