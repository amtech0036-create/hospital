const AuditService = require('../services/AuditService');

function auditLogMiddleware(action, entity) {
  return (req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
      res.json = originalJson;
      const entityId = req.params.id || req.params.barcode || req.params.orderId || req.body?.orderId || req.body?.resultId || 'N/A';
      const userId = req.user?.email || req.user?.id || 'anonymous';
      const userRole = req.user?.role || 'User';
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

      AuditService.logAction({
        userId,
        userRole,
        action,
        entity,
        entityId,
        ipAddress,
        details: `HTTP ${req.method} ${req.originalUrl}`
      });

      return originalJson.call(this, body);
    };
    next();
  };
}

module.exports = auditLogMiddleware;
