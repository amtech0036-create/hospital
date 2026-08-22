const NursingService = require('../services/NursingService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await NursingService.list(req.query);
  return success(res, { message: 'Nursing records loaded.', data: result.nursingLogs, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await NursingService.create(req.body);
  return success(res, { message: 'Nursing log / MAR entry saved.', data: item, status: 201 });
});

module.exports = { list, create };
