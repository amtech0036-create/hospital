const BaseMongoRepository = require('./BaseMongoRepository');

const TENANT_COLUMNS = [
  'id',
  'name',
  'subdomain',
  'licenseKey',
  'licenseTier',
  'maxUsers',
  'isActive',
  'expiresAt',
  'createdAt',
  'updatedAt'
];

class TenantRepository extends BaseMongoRepository {
  constructor() {
    super('tenants', TENANT_COLUMNS, 'TNT', 'id');
  }

  async findBySubdomain(subdomain) {
    if (!subdomain) return null;
    return this.findOne({ subdomain: subdomain.toLowerCase().trim() });
  }
}

module.exports = TenantRepository;
