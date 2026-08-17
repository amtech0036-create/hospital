const { AsyncLocalStorage } = require('node:async_hooks');

const tenantStorage = new AsyncLocalStorage();

/**
 * Executes a callback within the context of a specific tenant object.
 * @param {Object} tenant - Tenant object (must include id, subdomain, etc.)
 * @param {Function} callback - Function to execute
 */
function runWithTenant(tenant, callback) {
  return tenantStorage.run(tenant, callback);
}

/**
 * Returns the active tenant object from the current async execution context.
 * @returns {Object|null}
 */
function getCurrentTenant() {
  return tenantStorage.getStore() || null;
}

/**
 * Returns the active tenantId string from the current async execution context.
 * @returns {string|null}
 */
function getCurrentTenantId() {
  const tenant = getCurrentTenant();
  return tenant ? tenant.id : null;
}

module.exports = {
  tenantStorage,
  runWithTenant,
  getCurrentTenant,
  getCurrentTenantId
};
