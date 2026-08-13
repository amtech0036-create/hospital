const BackupService = require('../services/BackupService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const getStatus = asyncHandler(async (req, res) => {
  const status = await BackupService.getStatus();
  return success(res, { message: 'Backup status loaded.', data: status });
});

const downloadBackup = asyncHandler(async (req, res) => {
  const format = String(req.query.format || 'zip').toLowerCase();
  const exportData = await BackupService.exportAllSheets();
  const stamp = BackupService._fileTimestamp(new Date(exportData.exportedAt));
  await BackupService.recordDownload();

  if (format === 'json') {
    const payload = BackupService.buildJsonPayload(exportData);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="erp-backup-${stamp}.json"`);
    return res.send(JSON.stringify(payload, null, 2));
  }

  if (format !== 'zip') {
    const err = new Error('Invalid format. Use zip or json.');
    err.status = 422;
    throw err;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="erp-backup-${stamp}.zip"`);
  BackupService.createZipStream(exportData).pipe(res);
});

const createDriveCopy = asyncHandler(async (req, res) => {
  const result = await BackupService.createDriveCopy({ triggeredBy: 'manual' });
  return success(res, { message: 'Google Drive backup copy created.', data: result });
});

module.exports = { getStatus, downloadBackup, createDriveCopy };
