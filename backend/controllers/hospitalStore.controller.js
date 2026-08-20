const HospitalStoreService = require('../services/HospitalStoreService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const createRequisition = asyncHandler(async (req, res) => {
  const reqDoc = await HospitalStoreService.createRequisition(req.body);
  return success(res, { message: 'Store Requisition created successfully.', data: reqDoc, status: 201 });
});

const approveRequisition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const approved = await HospitalStoreService.approveRequisition(id, req.body);
  return success(res, { message: 'Store Requisition approved successfully.', data: approved });
});

const listRequisitions = asyncHandler(async (req, res) => {
  const list = await HospitalStoreService.listRequisitions(req.query);
  return success(res, { message: 'Store requisitions loaded.', data: list });
});

module.exports = {
  createRequisition,
  approveRequisition,
  listRequisitions
};
