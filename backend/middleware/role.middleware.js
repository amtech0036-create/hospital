const { failure } = require('../utils/apiResponse');

/**
 * Usage: router.get('/x', authenticate, authorize('Admin', 'Manager'), handler)
 * Must run after `authenticate` (needs req.user.role).
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return failure(res, { message: 'Not authenticated.', status: 401 });
    }

    const userRole = (req.user.role || '').trim();
    const isDemo = userRole.toLowerCase() === 'demo';

    // Global Demo Role Restriction: Block all write/update/delete operations
    if (isDemo && req.method !== 'GET') {
      return failure(res, {
        message: 'Demo mode is read-only. Create, edit, and delete actions are disabled in demo mode.',
        status: 403
      });
    }

    // Support role aliases (Sales / Sales User)
    const normalizedAllowed = new Set();
    allowedRoles.forEach((role) => {
      normalizedAllowed.add(role);
      if (role === 'Sales') normalizedAllowed.add('Sales User');
      if (role === 'Sales User') normalizedAllowed.add('Sales');
    });

    const hasPermission = normalizedAllowed.has(userRole) || (isDemo && (normalizedAllowed.has('Demo') || normalizedAllowed.has('DEMO')));

    if (!hasPermission) {
      return failure(res, { message: 'You do not have permission to perform this action.', status: 403 });
    }

    next();
  };
}

module.exports = authorize;
