const { tenantRepository } = require('../repositories');
const { runWithTenant } = require('../context/tenantContext');
const { failure } = require('../utils/apiResponse');

const ROOT_DOMAIN = 'amtechslnbderp.com';

function extractSubdomain(req) {
  // 1. Explicit Header Override (great for Postman / local testing)
  const headerSubdomain = req.headers['x-tenant-subdomain'];
  if (headerSubdomain && typeof headerSubdomain === 'string') {
    return headerSubdomain.trim().toLowerCase();
  }

  // 2. Parse Host Header
  const host = (req.headers.host || '').split(':')[0].toLowerCase().trim();

  if (host && host.endsWith(ROOT_DOMAIN)) {
    const parts = host.replace(`.${ROOT_DOMAIN}`, '').split('.');
    if (parts.length > 0 && parts[0] !== ROOT_DOMAIN && parts[0] !== 'www') {
      return parts[0];
    }
  }

  // 3. Dev Localhost subdomain simulation (e.g. shopz.localhost)
  if (host.includes('.localhost')) {
    const parts = host.split('.localhost');
    if (parts[0]) return parts[0];
  }

  return null;
}

async function tenantResolverMiddleware(req, res, next) {
  // Allow super-admin endpoints without requiring a specific tenant subdomain
  if (req.path.startsWith('/super-admin') || req.path.startsWith('/api/super-admin')) {
    return next();
  }

  let subdomain = extractSubdomain(req);
  const tenantIdHeader = req.headers['x-tenant-id'];

  let tenant = null;

  if (tenantIdHeader) {
    tenant = await tenantRepository.findById(tenantIdHeader);
  } else if (subdomain) {
    tenant = await tenantRepository.findBySubdomain(subdomain);
  } else {
    // Default fallback tenant for root domain / direct API access
    tenant = await tenantRepository.findBySubdomain('default');
    if (!tenant) {
      try {
        tenant = await tenantRepository.create({
          id: 'TNT-000001',
          name: 'Default Hospital Tenant',
          subdomain: 'default',
          contactEmail: 'admin@amtechslnbderp.com',
          isActive: true,
          maxUsers: 100
        });
      } catch (err) {
        const all = await tenantRepository.findAll();
        tenant = all[0] || null;
      }
    }
  }

  if (!tenant) {
    return failure(res, {
      message: `Tenant not found for subdomain/header "${subdomain || tenantIdHeader || 'root'}".`,
      status: 404
    });
  }

  if (tenant.isActive === false) {
    return failure(res, {
      message: `Tenant "${tenant.name}" (${tenant.subdomain}) is currently inactive. Contact your system administrator.`,
      status: 403
    });
  }

  if (tenant.expiresAt && new Date(tenant.expiresAt).getTime() < Date.now()) {
    return failure(res, {
      message: `License for tenant "${tenant.name}" expired on ${new Date(tenant.expiresAt).toISOString().split('T')[0]}. Please renew your subscription.`,
      status: 403
    });
  }

  // Bind tenant info to request
  req.tenant = tenant;
  req.tenantId = tenant.id;

  // Run downstream handlers inside AsyncLocalStorage context
  runWithTenant(tenant, () => {
    next();
  });
}

module.exports = tenantResolverMiddleware;
