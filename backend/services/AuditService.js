const { clinicalAuditLogRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');
const logger = require('../utils/logger');

class AuditService {
  async logAction({ userId, userRole, action, entity, entityId, ipAddress = '', details = '' }) {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return null;

    try {
      const log = await clinicalAuditLogRepository.create({
        tenantId,
        userId: userId || 'anonymous',
        userRole: userRole || 'User',
        action,
        entity,
        entityId: String(entityId),
        ipAddress,
        details
      });
      return log;
    } catch (err) {
      logger.error(`Failed to record audit log: ${err.message}`);
      return null;
    }
  }
}

module.exports = new AuditService();
