const OpdService = require('../services/OpdService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await OpdService.createAppointment(req.body);
  return success(res, { message: 'OPD Appointment booked successfully.', data: appointment, status: 201 });
});

const getDoctorQueue = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;
  const queueData = await OpdService.getDoctorQueue(doctorId, date);
  return success(res, { message: 'Doctor queue loaded.', data: queueData });
});

const updateVitals = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await OpdService.updateVitals(id, req.body);
  return success(res, { message: 'Nurse triage vitals captured.', data: updated });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await OpdService.updateStatus(id, status);
  return success(res, { message: `Appointment status updated to ${status}.`, data: updated });
});

const createSchedule = asyncHandler(async (req, res) => {
  const schedule = await OpdService.createSchedule(req.body);
  return success(res, { message: 'Doctor schedule created.', data: schedule, status: 201 });
});

const listSchedules = asyncHandler(async (req, res) => {
  const schedules = await OpdService.listSchedules(req.query);
  return success(res, { message: 'Doctor schedules loaded.', data: schedules });
});

module.exports = {
  createAppointment,
  getDoctorQueue,
  updateVitals,
  updateStatus,
  createSchedule,
  listSchedules
};
