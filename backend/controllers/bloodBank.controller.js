const BloodBankService = require('../services/BloodBankService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const registerBloodUnit = asyncHandler(async (req, res) => {
  const unit = await BloodBankService.registerBloodUnit(req.body);
  return success(res, { message: 'Blood unit registered successfully.', data: unit, status: 201 });
});

const getBloodInventory = asyncHandler(async (req, res) => {
  const inventory = await BloodBankService.getBloodInventory();
  return success(res, { message: 'Blood bank inventory loaded.', data: inventory });
});

const updateBloodUnitStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await BloodBankService.updateBloodUnitStatus(id, req.body);
  return success(res, { message: 'Blood unit status updated.', data: updated });
});

module.exports = {
  registerBloodUnit,
  getBloodInventory,
  updateBloodUnitStatus
};
