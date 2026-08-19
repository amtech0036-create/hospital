const { SettingsService, UserService } = require('../services/SettingsService');
const BackupService = require('../services/BackupService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await SettingsService.getAll();
  return success(res, { message: 'Settings loaded.', data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await SettingsService.update(req.body);
  return success(res, { message: 'Settings saved.', data: settings });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await UserService.list();
  return success(res, { message: 'User list.', data: users });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await UserService.create(req.body);
  return success(res, { message: 'User created.', data: user, status: 201 });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await UserService.update(req.params.id, req.body, { currentUserId: req.user?.id });
  return success(res, { message: 'User updated.', data: user });
});

const deactivateUser = asyncHandler(async (req, res) => {
  await UserService.deactivate(req.params.id, { currentUserId: req.user?.id });
  return success(res, { message: 'User deactivated.' });
});

const downloadBackup = asyncHandler(async (req, res) => {
  const data = await BackupService.exportJson({ tenantId: req.tenantId });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="erp-database-backup-${stamp}.json"`);
  return res.send(JSON.stringify(data, null, 2));
});

module.exports = { getSettings, updateSettings, listUsers, createUser, updateUser, deactivateUser, downloadBackup };
