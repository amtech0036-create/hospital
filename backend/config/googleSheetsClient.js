const { google } = require('googleapis');
const { getGoogleAuth } = require('./googleAuth');
const env = require('./env');

/**
 * Lazily-created singleton for the Google Sheets API client.
 *
 * IMPORTANT (architecture rule):
 * Nothing outside backend/repositories/googlesheets/* should import this file,
 * except backup/export utilities that read raw sheet data.
 * Business logic (services/) must never touch Google APIs directly — it only
 * talks to repository interfaces. That is what lets us swap Google Sheets
 * for MySQL later without touching services or controllers.
 */
let sheetsClientPromise = null;

async function getSheetsClient() {
  if (sheetsClientPromise) return sheetsClientPromise;

  sheetsClientPromise = (async () => {
    const auth = await getGoogleAuth();
    return google.sheets({ version: 'v4', auth });
  })();

  return sheetsClientPromise;
}

function getSpreadsheetId() {
  return env.GOOGLE_SHEETS_SPREADSHEET_ID;
}

module.exports = { getSheetsClient, getSpreadsheetId };
