const BaseMongoRepository = require('./BaseMongoRepository');

const COLUMNS = [
  'id', 'tenantId', 'userId', 'userRole', 'action', 'entity', 'entityId',
  'ipAddress', 'details', 'createdAt', 'updatedAt'
];

class ClinicalAuditLogRepository extends BaseMongoRepository {
  constructor() {
    super('clinical_audit_logs', COLUMNS, 'AUD', 'id');
  }
}

module.exports = ClinicalAuditLogRepository;
