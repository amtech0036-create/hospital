const { google } = require('googleapis');
const { getGoogleAuth } = require('./googleAuth');

let driveClientPromise = null;

async function getDriveClient() {
  if (driveClientPromise) return driveClientPromise;

  driveClientPromise = (async () => {
    const auth = await getGoogleAuth();
    return google.drive({ version: 'v3', auth });
  })();

  return driveClientPromise;
}

module.exports = { getDriveClient };
