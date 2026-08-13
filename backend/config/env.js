require('dotenv').config();

/**
 * Central place where every environment variable is read.
 * Nothing else in the codebase should call process.env directly —
 * that keeps config concerns in one file and makes it obvious
 * what the app depends on.
 */
function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_only_insecure_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  DB_DRIVER: process.env.DB_DRIVER || 'googlesheets',

  GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_PRIVATE_KEY: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),

  /** Automatic Google Drive spreadsheet copy interval (hours). 0 = disabled. */
  BACKUP_DRIVE_AUTO_HOURS: parseInt(process.env.BACKUP_DRIVE_AUTO_HOURS || '24', 10),
  /** Keep this many Drive backup copies; older copies are deleted after each new backup. */
  BACKUP_DRIVE_RETAIN_COUNT: parseInt(process.env.BACKUP_DRIVE_RETAIN_COUNT || '7', 10),
  BACKUP_DRIVE_FOLDER_ID: (process.env.BACKUP_DRIVE_FOLDER_ID || '').trim(),
  BACKUP_DRIVE_OWNER_EMAIL: (process.env.BACKUP_DRIVE_OWNER_EMAIL || '').trim(),

  isProduction() {
    return this.NODE_ENV === 'production';
  },

  assertGoogleSheetsConfigured() {
    required('GOOGLE_SHEETS_SPREADSHEET_ID');
    required('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    required('GOOGLE_PRIVATE_KEY');
  }
};

module.exports = env;
