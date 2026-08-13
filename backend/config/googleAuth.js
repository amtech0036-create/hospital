const { google } = require('googleapis');
const env = require('./env');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

let authPromise = null;

async function getGoogleAuth() {
  if (authPromise) return authPromise;

  authPromise = (async () => {
    env.assertGoogleSheetsConfigured();

    const auth = new google.auth.JWT({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: env.GOOGLE_PRIVATE_KEY,
      scopes: SCOPES
    });

    await auth.authorize();
    return auth;
  })();

  return authPromise;
}

module.exports = { getGoogleAuth, SCOPES };
