const BloodBankService = require('../services/BloodBankService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await BloodBankService.list(req.query);
  return success(res, { message: 'Blood bank inventory & cross-matching records loaded.', data: result.bloodInventory, meta: result.pagination });
});

const create = asyncHandler(async (req, res) => {
  const item = await BloodBankService.create(req.body);
  return success(res, { message: 'Blood bag collected & stored in inventory.', data: item, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const item = await BloodBankService.update(req.params.id, req.body);
  return success(res, { message: 'Blood bag status / cross-match updated.', data: item });
});

module.exports = { list, create, update };
