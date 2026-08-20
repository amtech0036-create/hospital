const PatientService = require('../services/PatientService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await PatientService.list(req.query);
  return success(res, { message: 'Patient list loaded.', data: result.patients, meta: result.pagination });
});

const getOne = asyncHandler(async (req, res) => {
  const patient = await PatientService.getById(req.params.id);
  return success(res, { message: 'Patient details loaded.', data: patient });
});

const create = asyncHandler(async (req, res) => {
  const patient = await PatientService.create(req.body);
  return success(res, { message: 'Patient registered successfully.', data: patient, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const patient = await PatientService.update(req.params.id, req.body);
  return success(res, { message: 'Patient record updated.', data: patient });
});

const remove = asyncHandler(async (req, res) => {
  await PatientService.remove(req.params.id);
  return success(res, { message: 'Patient record deleted.' });
});

module.exports = { list, getOne, create, update, remove };
