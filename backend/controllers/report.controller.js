const ReportService = require('../services/ReportService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const getReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const report = await ReportService.getReport({ from, to });
  return success(res, { message: 'Report generated.', data: report });
});

module.exports = { getReport };
