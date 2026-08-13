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
    if (!allowedRoles.includes(req.user.role)) {
      return failure(res, { message: 'You do not have permission to perform this action.', status: 403 });
    }
    next();
  };
}

module.exports = authorize;
