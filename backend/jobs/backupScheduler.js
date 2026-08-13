const BackupService = require('../services/BackupService');
const env = require('../config/env');
const logger = require('../utils/logger');

let schedulerStarted = false;
let intervalHandle = null;

function startBackupScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  if (env.DB_DRIVER !== 'googlesheets') return;
  if (!env.BACKUP_DRIVE_AUTO_HOURS || env.BACKUP_DRIVE_AUTO_HOURS <= 0) {
    logger.info('Automatic Google Drive backup is disabled (set BACKUP_DRIVE_AUTO_HOURS to enable).');
    return;
  }

  const intervalMs = env.BACKUP_DRIVE_AUTO_HOURS * 60 * 60 * 1000;

  async function runAutoBackup({ force = false } = {}) {
    try {
      if (!force) {
        const status = await BackupService.getStatus();
        const lastAt = status.lastDriveCopy?.at ? new Date(status.lastDriveCopy.at).getTime() : 0;
        if (lastAt && Date.now() - lastAt < intervalMs) {
          logger.info('Skipping automatic Drive backup — recent copy already exists.');
          return;
        }
      }
      await BackupService.createDriveCopy({ triggeredBy: 'auto' });
    } catch (err) {
      logger.error('Automatic Google Drive backup failed:', err.message);
    }
  }

  intervalHandle = setInterval(() => runAutoBackup(), intervalMs);
  logger.info(`Automatic Google Drive backup scheduled every ${env.BACKUP_DRIVE_AUTO_HOURS} hour(s).`);

  // Run once on startup if no recent backup exists.
  setTimeout(() => runAutoBackup(), 30 * 1000);
}

function stopBackupScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { startBackupScheduler, stopBackupScheduler };
