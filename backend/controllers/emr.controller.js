const EmrService = require('../services/EmrService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const createPrescription = asyncHandler(async (req, res) => {
  const prescription = await EmrService.createPrescription(req.body);
  return success(res, { message: 'Electronic Prescription generated successfully.', data: prescription, status: 201 });
});

const getEmrTimeline = asyncHandler(async (req, res) => {
  const { uhid } = req.params;
  const timelineData = await EmrService.getEmrTimeline(uhid);
  return success(res, { message: 'EMR Timeline loaded.', data: timelineData });
});

const getPrescription = asyncHandler(async (req, res) => {
  const { prescriptionNumber } = req.params;
  const prescription = await EmrService.getPrescriptionByNumber(prescriptionNumber);
  return success(res, { message: 'Prescription details loaded.', data: prescription });
});

module.exports = {
  createPrescription,
  getEmrTimeline,
  getPrescription
};
