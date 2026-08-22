const PathologyService = require('../services/PathologyService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await PathologyService.list(req.query);
  return success(res, { message: 'Pathology lab orders loaded.', data: result.orders, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await PathologyService.create(req.body);
  return success(res, { message: 'Pathology test order & barcode generated.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await PathologyService.update(req.params.id, req.body);
  return success(res, { message: 'Pathology test result verified.', data: item });
});

module.exports = { list, create, update };
