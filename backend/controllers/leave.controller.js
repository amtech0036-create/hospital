const LeaveService = require('../services/LeaveService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const leaves = await LeaveService.list(req.query);
  return success(res, { message: 'Leave requests.', data: leaves });
});

const getOne = asyncHandler(async (req, res) => {
  const leave = await LeaveService.getById(req.params.id);
  return success(res, { message: 'Leave detail.', data: leave });
});

const create = asyncHandler(async (req, res) => {
  const leave = await LeaveService.create(req.body);
  return success(res, { message: 'Leave requested.', data: leave, status: 201 });
});

const updateStatus = asyncHandler(async (req, res) => {
  const leave = await LeaveService.updateStatus(req.params.id, {
    status: req.body.status,
    approvedBy: req.user?.email
  });
  return success(res, { message: 'Leave status updated.', data: leave });
});

const remove = asyncHandler(async (req, res) => {
  await LeaveService.remove(req.params.id);
  return success(res, { message: 'Leave request deleted.' });
});

module.exports = { list, getOne, create, updateStatus, remove };
