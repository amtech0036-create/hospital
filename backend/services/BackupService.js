const archiver = require('archiver');
const { PassThrough } = require('stream');
const { getSheetsClient, getSpreadsheetId } = require('../config/googleSheetsClient');
const { getDriveClient } = require('../config/googleDriveClient');
const env = require('../config/env');
const { settingsRepository } = require('../repositories');
const logger = require('../utils/logger');

const BACKUP_META_KEYS = {
  lastDriveAt: 'backupLastDriveAt',
  lastDriveCopyId: 'backupLastDriveCopyId',
  lastDriveCopyName: 'backupLastDriveCopyName',
  lastDriveCopyUrl: 'backupLastDriveCopyUrl',
  lastDownloadAt: 'backupLastDownloadAt'
};

const DRIVE_COPY_PREFIX = 'Inventory ERP Backup';

class BackupService {
  _timestampLabel(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}`;
  }

  _fileTimestamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  _escapeCsvCell(value) {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  _rowsToCsv(values) {
    if (!values.length) return '';
    return values.map((row) => row.map((cell) => this._escapeCsvCell(cell)).join(',')).join('\n');
  }

  async exportAllSheets() {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title'
    });

    const sheetNames = (meta.data.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter(Boolean);

    if (sheetNames.length === 0) {
      const err = new Error('No sheets found in the spreadsheet.');
      err.status = 404;
      throw err;
    }

    const ranges = sheetNames.map((name) => `'${name.replace(/'/g, "''")}'`);
    const batch = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
      majorDimension: 'ROWS'
    });

    const exportedAt = new Date().toISOString();
    const sheetsData = {};

    (batch.data.valueRanges || []).forEach((valueRange, index) => {
      const name = sheetNames[index];
      const values = valueRange.values || [];
      const headers = values[0] || [];
      const rows = values.slice(1).map((row) => {
        const record = {};
        headers.forEach((header, i) => {
          record[header] = row[i] !== undefined ? row[i] : '';
        });
        return record;
      });

      sheetsData[name] = {
        headers,
        rowCount: rows.length,
        rows,
        csv: this._rowsToCsv(values)
      };
    });

    return {
      exportedAt,
      spreadsheetId,
      spreadsheetTitle: meta.data.properties?.title || 'Inventory ERP',
      sheetCount: sheetNames.length,
      sheets: sheetsData
    };
  }

  buildJsonPayload(exportData) {
    return {
      exportedAt: exportData.exportedAt,
      spreadsheetId: exportData.spreadsheetId,
      spreadsheetTitle: exportData.spreadsheetTitle,
      sheetCount: exportData.sheetCount,
      sheets: Object.fromEntries(
        Object.entries(exportData.sheets).map(([name, sheet]) => [name, sheet.rows])
      )
    };
  }

  createZipStream(exportData) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    archive.append(JSON.stringify(this.buildJsonPayload(exportData), null, 2), {
      name: 'backup.json'
    });

    archive.append(
      [
        'Inventory ERP Database Backup',
        `Exported: ${exportData.exportedAt}`,
        `Spreadsheet: ${exportData.spreadsheetTitle}`,
        `Spreadsheet ID: ${exportData.spreadsheetId}`,
        `Sheets: ${exportData.sheetCount}`,
        '',
        'Contents:',
        '- backup.json — full data export',
        '- *.csv — one file per Google Sheet tab'
      ].join('\n'),
      { name: 'README.txt' }
    );

    for (const [name, sheet] of Object.entries(exportData.sheets)) {
      const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
      archive.append(sheet.csv || '', { name: `${safeName}.csv` });
    }

    archive.finalize();
    return stream;
  }

  async recordDownload() {
    await settingsRepository.upsert(BACKUP_META_KEYS.lastDownloadAt, new Date().toISOString());
  }

  async getStatus() {
    const stored = await settingsRepository.getAllAsMap();
    return {
      lastDownloadAt: stored[BACKUP_META_KEYS.lastDownloadAt] || null,
      lastDriveCopy: stored[BACKUP_META_KEYS.lastDriveAt]
        ? {
            at: stored[BACKUP_META_KEYS.lastDriveAt],
            copyId: stored[BACKUP_META_KEYS.lastDriveCopyId] || null,
            name: stored[BACKUP_META_KEYS.lastDriveCopyName] || null,
            url: stored[BACKUP_META_KEYS.lastDriveCopyUrl] || null
          }
        : null,
      autoDriveBackupHours: env.BACKUP_DRIVE_AUTO_HOURS,
      driveRetainCount: env.BACKUP_DRIVE_RETAIN_COUNT
    };
  }

  async _saveDriveCopyMeta({ copyId, copyName, webViewLink }) {
    const now = new Date().toISOString();
    await settingsRepository.upsert(BACKUP_META_KEYS.lastDriveAt, now);
    await settingsRepository.upsert(BACKUP_META_KEYS.lastDriveCopyId, copyId);
    await settingsRepository.upsert(BACKUP_META_KEYS.lastDriveCopyName, copyName);
    await settingsRepository.upsert(BACKUP_META_KEYS.lastDriveCopyUrl, webViewLink || '');
  }

  async _resolveDriveCopyParent(drive, spreadsheetId) {
    if (env.BACKUP_DRIVE_FOLDER_ID) {
      return env.BACKUP_DRIVE_FOLDER_ID;
    }

    const original = await drive.files.get({
      fileId: spreadsheetId,
      fields: 'parents',
      supportsAllDrives: true
    });

    const parents = original.data.parents || [];
    if (parents.length) {
      return parents[0];
    }

    const err = new Error(
      'Drive backup folder is not configured. Create a folder in Google Drive (e.g. "ERP Backups"), share it with your service account as Editor, then set BACKUP_DRIVE_FOLDER_ID in .env to that folder ID.'
    );
    err.status = 422;
    throw err;
  }

  async _resolveDriveOwnerEmail(drive, spreadsheetId) {
    if (env.BACKUP_DRIVE_OWNER_EMAIL) {
      return env.BACKUP_DRIVE_OWNER_EMAIL;
    }

    const original = await drive.files.get({
      fileId: spreadsheetId,
      fields: 'owners(emailAddress)',
      supportsAllDrives: true
    });

    const ownerEmail = original.data.owners?.[0]?.emailAddress;
    if (!ownerEmail) {
      const err = new Error(
        'Could not determine spreadsheet owner. Set BACKUP_DRIVE_OWNER_EMAIL in .env to your Google account email.'
      );
      err.status = 422;
      throw err;
    }

    return ownerEmail;
  }

  _formatDriveError(err, fallback) {
    const googleMessage = err?.response?.data?.error?.message;
    if (!googleMessage) return fallback;

    if (/storage quota has been exceeded/i.test(googleMessage)) {
      if (env.BACKUP_DRIVE_FOLDER_ID) {
        return (
          'Google Drive copy failed: your Google account storage is full. ' +
          'Free up space in Google Drive (https://one.google.com/storage), then try again. ' +
          'ZIP/JSON download backup still works without Drive space.'
        );
      }
      return (
        'Google Drive copy failed: service accounts cannot store files on their own. ' +
        'Create a folder in your Google Drive, share it with your service account as Editor, ' +
        'and set BACKUP_DRIVE_FOLDER_ID in .env to that folder ID.'
      );
    }

    return `${fallback} (${googleMessage})`;
  }

  async _transferCopyOwnership(drive, copyId, ownerEmail) {
    try {
      await drive.permissions.create({
        fileId: copyId,
        transferOwnership: true,
        requestBody: {
          type: 'user',
          role: 'owner',
          emailAddress: ownerEmail
        },
        supportsAllDrives: true
      });
    } catch (err) {
      logger.warn(`Could not transfer backup ownership to ${ownerEmail}:`, err.message);
    }
  }

  async _pruneOldDriveCopies(retainCount) {
    if (!retainCount || retainCount < 1) return;

    const drive = await getDriveClient();
    const spreadsheetId = getSpreadsheetId();

    let parents = [];
    try {
      const original = await drive.files.get({
        fileId: spreadsheetId,
        fields: 'parents,name',
        supportsAllDrives: true
      });
      parents = original.data.parents || [];
    } catch (err) {
      logger.warn('Could not read spreadsheet parents for backup cleanup.', err.message);
      return;
    }

    const listParams = {
      q: `name contains '${DRIVE_COPY_PREFIX}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id,name,createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    };

    if (parents.length) {
      listParams.q += ` and '${parents[0]}' in parents`;
    } else if (env.BACKUP_DRIVE_FOLDER_ID) {
      listParams.q += ` and '${env.BACKUP_DRIVE_FOLDER_ID}' in parents`;
    }

    const listed = await drive.files.list(listParams);
    const files = listed.data.files || [];
    const toDelete = files.slice(retainCount);

    for (const file of toDelete) {
      try {
        await drive.files.delete({ fileId: file.id, supportsAllDrives: true });
        logger.info(`Removed old Drive backup: ${file.name}`);
      } catch (err) {
        logger.warn(`Failed to delete old Drive backup ${file.id}:`, err.message);
      }
    }
  }

  async createDriveCopy({ triggeredBy = 'manual' } = {}) {
    const drive = await getDriveClient();
    const spreadsheetId = getSpreadsheetId();

    let parentFolderId;
    let ownerEmail;

    try {
      parentFolderId = await this._resolveDriveCopyParent(drive, spreadsheetId);
      ownerEmail = await this._resolveDriveOwnerEmail(drive, spreadsheetId);
    } catch (err) {
      if (!err.status) err.status = 502;
      throw err;
    }

    const copyName = `${DRIVE_COPY_PREFIX} ${this._timestampLabel()}`;

    let copy;
    try {
      copy = await drive.files.copy({
        fileId: spreadsheetId,
        requestBody: {
          name: copyName,
          parents: [parentFolderId]
        },
        fields: 'id,name,webViewLink,createdTime',
        supportsAllDrives: true
      });
    } catch (err) {
      logger.error('Google Drive copy failed:', err.response?.data?.error || err.message);
      const apiErr = new Error(
        this._formatDriveError(
          err,
          'Google Drive copy failed. Share your backup folder with the service account as Editor.'
        )
      );
      apiErr.status = 502;
      apiErr.cause = err;
      throw apiErr;
    }

    const copyData = copy.data;
    await this._transferCopyOwnership(drive, copyData.id, ownerEmail);

    await this._saveDriveCopyMeta({
      copyId: copyData.id,
      copyName: copyData.name,
      webViewLink: copyData.webViewLink
    });

    await this._pruneOldDriveCopies(env.BACKUP_DRIVE_RETAIN_COUNT);

    logger.info(`Drive backup created (${triggeredBy}): ${copyData.name}`);

    return {
      copyId: copyData.id,
      name: copyData.name,
      webViewLink: copyData.webViewLink,
      createdTime: copyData.createdTime,
      triggeredBy,
      ownerEmail
    };
  }
}

module.exports = new BackupService();
