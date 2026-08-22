const OTService = require('../services/OTService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await OTService.list(req.query);
  return success(res, { message: 'Operation Theatre surgery schedule loaded.', data: result.surgeries, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await OTService.create(req.body);
  return success(res, { message: 'Surgery scheduled in OT.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await OTService.update(req.params.id, req.body);
  return success(res, { message: 'OT surgery record updated.', data: item });
});

module.exports = { list, create, update };
