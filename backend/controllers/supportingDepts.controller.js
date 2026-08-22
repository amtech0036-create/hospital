const SupportingDeptsService = require('../services/SupportingDeptsService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// Physiotherapy
const listPhysio = asyncHandler(async (req, res) => {
  const result = await SupportingDeptsService.listPhysio(req.query);
  return success(res, { message: 'Physiotherapy sessions loaded.', data: result.sessions, meta: result.pagination });
});
const createPhysio = asyncHandler(async (req, res) => {
  const item = await SupportingDeptsService.createPhysio(req.body);
  return success(res, { message: 'Physiotherapy session logged.', data: item, status: 201 });
});

// Dental
const listDental = asyncHandler(async (req, res) => {
  const result = await SupportingDeptsService.listDental(req.query);
  return success(res, { message: 'Dental records loaded.', data: result.records, meta: result.pagination });
});
const createDental = asyncHandler(async (req, res) => {
  const item = await SupportingDeptsService.createDental(req.body);
  return success(res, { message: 'Dental procedure record created.', data: item, status: 201 });
});

// Dietetics
const listDiet = asyncHandler(async (req, res) => {
  const result = await SupportingDeptsService.listDiet(req.query);
  return success(res, { message: 'Dietetics plans loaded.', data: result.diets, meta: result.pagination });
});
const createDiet = asyncHandler(async (req, res) => {
  const item = await SupportingDeptsService.createDiet(req.body);
  return success(res, { message: 'Patient diet plan created.', data: item, status: 201 });
});

// Mortuary
const listMortuary = asyncHandler(async (req, res) => {
  const result = await SupportingDeptsService.listMortuary(req.query);
  return success(res, { message: 'Mortuary records loaded.', data: result.records, meta: result.pagination });
});
const createMortuary = asyncHandler(async (req, res) => {
  const item = await SupportingDeptsService.createMortuary(req.body);
  return success(res, { message: 'Mortuary death registration saved.', data: item, status: 201 });
});

// Biomedical Equipment
const listBiomedical = asyncHandler(async (req, res) => {
  const result = await SupportingDeptsService.listBiomedical(req.query);
  return success(res, { message: 'Biomedical equipment inventory loaded.', data: result.equipment, meta: result.pagination });
});
const createBiomedical = asyncHandler(async (req, res) => {
  const item = await SupportingDeptsService.createBiomedical(req.body);
  return success(res, { message: 'Biomedical equipment registered.', data: item, status: 201 });
});

module.exports = {
  listPhysio, createPhysio,
  listDental, createDental,
  listDiet, createDiet,
  listMortuary, createMortuary,
  listBiomedical, createBiomedical
};
