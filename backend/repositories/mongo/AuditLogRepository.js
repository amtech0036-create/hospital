const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'userId', 'userName', 'role', 'department', 
  'action', 'resource', 'details', 'ipAddress', 'createdAt', 'updatedAt'
];

class AuditLogRepository extends BaseMongoRepository {
  constructor() {
    super('hospital_audit_logs', COLUMNS, ID_PREFIXES.AUDIT_LOG || 'AUDIT', 'id');
  }
}

module.exports = AuditLogRepository;
