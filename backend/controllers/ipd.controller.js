const IpdService = require('../services/IpdService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const getBedMatrix = asyncHandler(async (req, res) => {
  const matrix = await IpdService.getBedMatrix();
  return success(res, { message: 'Bed matrix loaded.', data: matrix });
});

const createBed = asyncHandler(async (req, res) => {
  const bed = await IpdService.createBed(req.body);
  return success(res, { message: 'Bed master created.', data: bed, status: 201 });
});

const listBeds = asyncHandler(async (req, res) => {
  const beds = await IpdService.listBeds(req.query);
  return success(res, { message: 'Beds loaded.', data: beds });
});

const admitPatient = asyncHandler(async (req, res) => {
  const admission = await IpdService.admitPatient(req.body);
  return success(res, { message: 'IPD Patient admitted successfully.', data: admission, status: 201 });
});

const dischargePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dischargeData = await IpdService.dischargePatient(id, req.body);
  return success(res, { message: 'IPD Patient discharged successfully.', data: dischargeData });
});

const updateBedStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await IpdService.updateBedStatus(id, status);
  return success(res, { message: `Bed status updated to ${status}.`, data: updated });
});

module.exports = {
  getBedMatrix,
  createBed,
  listBeds,
  updateBedStatus,
  admitPatient,
  dischargePatient
};
