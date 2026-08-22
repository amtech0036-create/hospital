const ICUService = require('../services/ICUService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await ICUService.list(req.query);
  return success(res, { message: 'ICU / CCU bed flowsheets loaded.', data: result.icuRecords, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await ICUService.create(req.body);
  return success(res, { message: 'ICU patient monitoring started.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await ICUService.update(req.params.id, req.body);
  return success(res, { message: 'ICU monitoring record updated.', data: item });
});

module.exports = { list, create, update };
