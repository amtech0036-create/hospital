const AttendanceService = require('../services/AttendanceService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const records = await AttendanceService.list(req.query);
  return success(res, { message: 'Attendance records.', data: records });
});

const getOne = asyncHandler(async (req, res) => {
  const record = await AttendanceService.getById(req.params.id);
  return success(res, { message: 'Attendance detail.', data: record });
});

const record = asyncHandler(async (req, res) => {
  const record = await AttendanceService.record(req.body);
  return success(res, { message: 'Attendance saved.', data: record, status: 201 });
});

const remove = asyncHandler(async (req, res) => {
  await AttendanceService.remove(req.params.id);
  return success(res, { message: 'Attendance deleted.' });
});

module.exports = { list, getOne, record, remove };
