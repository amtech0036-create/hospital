const RadiologyService = require('../services/RadiologyService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await RadiologyService.list(req.query);
  return success(res, { message: 'Radiology imaging worklist loaded.', data: result.orders, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await RadiologyService.create(req.body);
  return success(res, { message: 'Radiology procedure order created.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await RadiologyService.update(req.params.id, req.body);
  return success(res, { message: 'Radiology report & impression updated.', data: item });
});

module.exports = { list, create, update };
