const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'invoiceNumber', 'patient', 'uhid', 'patientSnapshot',
  'orderBarcode', 'tests', 'financials', 'referredDoctor', 'status',
  'createdBy', 'createdAt', 'updatedAt'
];

class DiagnosticOrderRepository extends BaseMongoRepository {
  constructor() {
    super('diagnostic_orders', COLUMNS, ID_PREFIXES.DIAGNOSTIC_ORDER, 'id');
  }
}

module.exports = DiagnosticOrderRepository;
