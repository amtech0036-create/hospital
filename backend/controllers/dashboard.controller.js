const DashboardService = require('../services/DashboardService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await DashboardService.getSummary();
  return success(res, { message: 'Dashboard summary.', data: summary });
});

module.exports = { getSummary };
