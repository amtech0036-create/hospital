const DoctorService = require('../services/DoctorService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const doctors = await DoctorService.list(req.query);
  return success(res, { message: 'Doctor list loaded.', data: doctors });
});

const create = asyncHandler(async (req, res) => {
  const doctor = await DoctorService.create(req.body);
  return success(res, { message: 'Doctor registered successfully.', data: doctor, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const doctor = await DoctorService.update(req.params.id, req.body);
  return success(res, { message: 'Doctor profile updated.', data: doctor });
});

const remove = asyncHandler(async (req, res) => {
  await DoctorService.remove(req.params.id);
  return success(res, { message: 'Doctor record deactivated.' });
});

module.exports = { list, create, update, remove };
