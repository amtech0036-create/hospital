const AdvanceService = require('../services/AdvanceService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const advances = await AdvanceService.list(req.query);
  return success(res, { message: 'Salary advances.', data: advances });
});

const getOne = asyncHandler(async (req, res) => {
  const advance = await AdvanceService.getById(req.params.id);
  return success(res, { message: 'Advance detail.', data: advance });
});

const create = asyncHandler(async (req, res) => {
  const advance = await AdvanceService.create(req.body);
  return success(res, { message: 'Salary advance recorded.', data: advance, status: 201 });
});

const getDeduction = asyncHandler(async (req, res) => {
  const amount = await AdvanceService.getDeductionForPayroll(req.params.employeeId);
  return success(res, { message: 'Advance deduction due.', data: { employeeId: req.params.employeeId, amount } });
});

const remove = asyncHandler(async (req, res) => {
  await AdvanceService.remove(req.params.id);
  return success(res, { message: 'Advance record deleted.' });
});

module.exports = { list, getOne, create, getDeduction, remove };
