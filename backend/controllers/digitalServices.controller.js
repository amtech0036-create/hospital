const DigitalServicesService = require('../services/DigitalServicesService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// Telemedicine
const listTelemedicine = asyncHandler(async (req, res) => {
  const result = await DigitalServicesService.listTelemedicine(req.query);
  return success(res, { message: 'Telemedicine sessions loaded.', data: result.sessions, meta: result.pagination });
});

const createTelemedicine = asyncHandler(async (req, res) => {
  const item = await DigitalServicesService.createTelemedicine(req.body);
  return success(res, { message: 'Telemedicine video consultation scheduled.', data: item, status: 201 });
});

// Executive Dashboard Analytics
const getExecutiveAnalytics = asyncHandler(async (req, res) => {
  const data = await DigitalServicesService.getExecutiveAnalytics();
  return success(res, { message: 'Executive hospital analytics calculated.', data });
});

// Audit Logs & Security
const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await DigitalServicesService.listAuditLogs(req.query);
  return success(res, { message: 'Hospital security audit trail loaded.', data: result.logs, meta: result.pagination });
});

// SMS / WhatsApp Gateway
const sendNotification = asyncHandler(async (req, res) => {
  const { type, recipientPhone, message } = req.body;
  const result = await DigitalServicesService.sendNotification(type || 'SMS', recipientPhone || '+8801700000000', message || 'Notification alert');
  return success(res, { message: 'Notification dispatched via gateway.', data: result });
});

module.exports = {
  listTelemedicine,
  createTelemedicine,
  getExecutiveAnalytics,
  listAuditLogs,
  sendNotification
};
