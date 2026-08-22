const SpecialtyClinicalService = require('../services/SpecialtyClinicalService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await SpecialtyClinicalService.list(req.query);
  return success(res, { message: 'Specialty clinical records loaded.', data: result.records, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await SpecialtyClinicalService.create(req.body);
  return success(res, { message: 'Specialty record saved.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await SpecialtyClinicalService.update(req.params.id, req.body);
  return success(res, { message: 'Specialty record updated.', data: item });
});

module.exports = { list, create, update };
