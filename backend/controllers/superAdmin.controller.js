const { tenantRepository, userRepository } = require('../repositories');
const LicenseService = require('../services/LicenseService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const createTenant = asyncHandler(async (req, res) => {
  const { name, subdomain, licenseTier = 1, expiresAt } = req.body;

  if (!name || !subdomain) {
    const err = new Error('Tenant name and subdomain are required.');
    err.status = 400;
    throw err;
  }

  const cleanSubdomain = subdomain.toLowerCase().trim();
  const existing = await tenantRepository.findBySubdomain(cleanSubdomain);
  if (existing) {
    const err = new Error(`A tenant with subdomain "${cleanSubdomain}" already exists.`);
    err.status = 409;
    throw err;
  }

  const tier = parseInt(licenseTier, 10) || 1;
  const maxUsers = LicenseService.getMaxUsersForTier(tier);
  const expirationDate = expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const licenseKey = LicenseService.generateLicenseKey({
    subdomain: cleanSubdomain,
    licenseTier: tier,
    maxUsers,
    expiresAt: expirationDate
  });

  const tenant = await tenantRepository.create({
    name: name.trim(),
    subdomain: cleanSubdomain,
    licenseKey,
    licenseTier: tier,
    maxUsers,
    isActive: true,
    expiresAt: expirationDate
  });

  return success(res, { message: 'Tenant provisioned successfully.', data: tenant, status: 201 });
});

const listTenants = asyncHandler(async (req, res) => {
  const tenants = await tenantRepository.findAll();

  const enriched = await Promise.all(
    tenants.map(async (t) => {
      const userCount = await userRepository.count({ tenantId: t.id, status: 'Active' });
      return {
        ...t,
        activeUserCount: userCount
      };
    })
  );

  return success(res, { message: 'Tenants loaded.', data: enriched });
});

const getTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenant = await tenantRepository.findById(id);
  if (!tenant) {
    const err = new Error('Tenant not found.');
    err.status = 404;
    throw err;
  }

  const activeUserCount = await userRepository.count({ tenantId: tenant.id, status: 'Active' });
  return success(res, { message: 'Tenant details loaded.', data: { ...tenant, activeUserCount } });
});

const updateTenantLicense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { licenseTier, expiresAt, licenseKey } = req.body;

  const tenant = await tenantRepository.findById(id);
  if (!tenant) {
    const err = new Error('Tenant not found.');
    err.status = 404;
    throw err;
  }

  let tier = tenant.licenseTier;
  let maxUsers = tenant.maxUsers;
  let exp = tenant.expiresAt;
  let key = tenant.licenseKey;

  if (licenseKey) {
    const verified = LicenseService.verifyLicenseKey(licenseKey, tenant.subdomain);
    tier = verified.tier;
    maxUsers = verified.maxUsers;
    exp = verified.expiresAt;
    key = licenseKey;
  } else if (licenseTier) {
    tier = parseInt(licenseTier, 10);
    maxUsers = LicenseService.getMaxUsersForTier(tier);
    exp = expiresAt ? new Date(expiresAt).toISOString() : tenant.expiresAt;
    key = LicenseService.generateLicenseKey({
      subdomain: tenant.subdomain,
      licenseTier: tier,
      maxUsers,
      expiresAt: exp
    });
  }

  const updated = await tenantRepository.update(id, {
    licenseTier: tier,
    maxUsers,
    expiresAt: exp,
    licenseKey: key
  });

  return success(res, { message: 'Tenant license updated.', data: updated });
});

const updateTenantStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const tenant = await tenantRepository.findById(id);
  if (!tenant) {
    const err = new Error('Tenant not found.');
    err.status = 404;
    throw err;
  }

  const updated = await tenantRepository.update(id, { isActive: Boolean(isActive) });
  return success(res, { message: `Tenant status set to ${isActive ? 'Active' : 'Inactive'}.`, data: updated });
});

const generateStandaloneLicense = asyncHandler(async (req, res) => {
  const { subdomain, licenseTier = 1, validDays = 365 } = req.body;

  if (!subdomain) {
    const err = new Error('Subdomain is required to generate a license key.');
    err.status = 400;
    throw err;
  }

  const tier = parseInt(licenseTier, 10) || 1;
  const maxUsers = LicenseService.getMaxUsersForTier(tier);
  const expiresAt = new Date(Date.now() + parseInt(validDays, 10) * 24 * 60 * 60 * 1000).toISOString();

  const licenseKey = LicenseService.generateLicenseKey({
    subdomain: subdomain.toLowerCase().trim(),
    licenseTier: tier,
    maxUsers,
    expiresAt
  });

  return success(res, {
    message: 'License key generated.',
    data: {
      subdomain: subdomain.toLowerCase().trim(),
      licenseTier: tier,
      maxUsers,
      expiresAt,
      licenseKey
    }
  });
});

module.exports = {
  createTenant,
  listTenants,
  getTenant,
  updateTenantLicense,
  updateTenantStatus,
  generateStandaloneLicense
};
