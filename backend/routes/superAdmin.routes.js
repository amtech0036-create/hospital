const express = require('express');
const router = express.Router();
const controller = require('../controllers/superAdmin.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const env = require('../config/env');
const { failure } = require('../utils/apiResponse');

/**
 * Super Admin Guard Middleware:
 * Accepts requests if user is logged in as Admin / SuperAdmin,
 * or if a valid X-SuperAdmin-Secret header matches JWT_SECRET / process.env.SUPER_ADMIN_SECRET.
 */
function superAdminGuard(req, res, next) {
  const secretHeader = req.headers['x-superadmin-secret'];
  const expectedSecret = env.SUPER_ADMIN_SECRET || process.env.SUPER_ADMIN_SECRET || env.JWT_SECRET;

  if (secretHeader && secretHeader === expectedSecret) {
    return next();
  }

  // Fallback to standard Auth JWT + Admin Role
  return authenticate(req, res, () => {
    return authorize('Admin', 'SuperAdmin')(req, res, next);
  });
}

router.use(superAdminGuard);

router.post('/tenants', controller.createTenant);
router.get('/tenants', controller.listTenants);
router.get('/tenants/:id', controller.getTenant);
router.put('/tenants/:id/license', controller.updateTenantLicense);
router.put('/tenants/:id/status', controller.updateTenantStatus);

router.post('/licenses/generate', controller.generateStandaloneLicense);

module.exports = router;
