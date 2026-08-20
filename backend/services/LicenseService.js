const crypto = require('crypto');
const env = require('../config/env');

const TIER_LIMITS = {
  1: 25,
  2: 50,
  3: 150,
  4: 500,
  starter: 25,
  clinic: 25,
  diagnostic: 50,
  hospital_standard: 150,
  enterprise: 500
};

class LicenseService {
  getSecret() {
    return env.JWT_SECRET || 'dev_license_signing_secret';
  }

  getMaxUsersForTier(tier) {
    if (typeof tier === 'string' && TIER_LIMITS[tier.toLowerCase()]) {
      return TIER_LIMITS[tier.toLowerCase()];
    }
    const num = parseInt(tier, 10);
    return TIER_LIMITS[num] || TIER_LIMITS[1];
  }

  /**
   * Generates a signed license key string for a given subdomain, tier, and expiration.
   * Format: payload.signature (where payload is base64url JSON)
   */
  generateLicenseKey({ subdomain, licenseTier, maxUsers, expiresAt }) {
    const tier = parseInt(licenseTier || 1, 10);
    const usersLimit = maxUsers || this.getMaxUsersForTier(tier);
    const exp = expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const payloadObj = {
      subdomain: subdomain.toLowerCase().trim(),
      tier,
      maxUsers: usersLimit,
      expiresAt: exp,
      issuedAt: new Date().toISOString()
    };

    const payloadStr = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const signature = crypto.createHmac('sha256', this.getSecret()).update(payloadStr).digest('base64url');

    return `${payloadStr}.${signature}`;
  }

  /**
   * Verifies and decodes a license key.
   * Throws an error if invalid, tampered, or mismatched with subdomain.
   */
  verifyLicenseKey(licenseKey, expectedSubdomain = null) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      const err = new Error('Invalid license key format.');
      err.status = 400;
      throw err;
    }

    const parts = licenseKey.split('.');
    if (parts.length !== 2) {
      const err = new Error('Malformed license key structure.');
      err.status = 400;
      throw err;
    }

    const [payloadStr, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', this.getSecret()).update(payloadStr).digest('base64url');

    if (signature !== expectedSig) {
      const err = new Error('Invalid license key signature.');
      err.status = 400;
      throw err;
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    } catch (e) {
      const err = new Error('Corrupted license key payload.');
      err.status = 400;
      throw err;
    }

    if (expectedSubdomain && payload.subdomain.toLowerCase() !== expectedSubdomain.toLowerCase()) {
      const err = new Error(`License key was issued for subdomain "${payload.subdomain}", not "${expectedSubdomain}".`);
      err.status = 400;
      throw err;
    }

    if (new Date(payload.expiresAt).getTime() < Date.now()) {
      const err = new Error('License key has expired.');
      err.status = 403;
      throw err;
    }

    return payload;
  }
}

module.exports = new LicenseService();
