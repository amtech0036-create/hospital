/**
 * One-time helper: reads a downloaded Google service account JSON key
 * and writes GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY into .env
 * correctly, avoiding manual copy-paste corruption of the private key.
 *
 * Usage:
 *   node setup-env.js path\to\your-key-file.json
 *
 * Safe to run more than once — it replaces the two lines if they
 * already exist, or appends them if they don't.
 */
const fs = require('fs');
const path = require('path');

const keyFilePath = process.argv[2];
if (!keyFilePath) {
  console.error('Usage: node setup-env.js path\\to\\service-account-key.json');
  process.exit(1);
}

const raw = fs.readFileSync(keyFilePath, 'utf8');
const keyData = JSON.parse(raw);

if (!keyData.client_email || !keyData.private_key) {
  console.error('This JSON file does not look like a service account key (missing client_email or private_key).');
  process.exit(1);
}

// Convert real newlines in the key back into literal \n so it fits on one .env line.
const escapedKey = keyData.private_key.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');

const envPath = path.join(process.cwd(), '.env');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function setEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  return content.trimEnd() + '\n' + line + '\n';
}

envContent = setEnvVar(envContent, 'GOOGLE_SERVICE_ACCOUNT_EMAIL', keyData.client_email);
envContent = setEnvVar(envContent, 'GOOGLE_PRIVATE_KEY', `"${escapedKey}"`);

fs.writeFileSync(envPath, envContent, 'utf8');

console.log('Updated .env with:');
console.log('  GOOGLE_SERVICE_ACCOUNT_EMAIL =', keyData.client_email);
console.log('  GOOGLE_PRIVATE_KEY = (written, ' + escapedKey.length + ' characters)');
console.log('');
console.log('Now delete the downloaded key file — it is no longer needed on disk:');
console.log('  ' + path.resolve(keyFilePath));