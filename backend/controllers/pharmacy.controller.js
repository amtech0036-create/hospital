const PharmacyService = require('../services/PharmacyService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const getPrescriptionCart = asyncHandler(async (req, res) => {
  const { prescriptionNumber } = req.params;
  const cart = await PharmacyService.getPrescriptionCart(prescriptionNumber);
  return success(res, { message: 'Prescription cart loaded for pharmacy checkout.', data: cart });
});

const processPharmacySale = asyncHandler(async (req, res) => {
  const saleResult = await PharmacyService.processPharmacySale(req.body);
  return success(res, { message: 'Pharmacy FEFO sale completed successfully.', data: saleResult, status: 201 });
});

module.exports = {
  getPrescriptionCart,
  processPharmacySale
};
