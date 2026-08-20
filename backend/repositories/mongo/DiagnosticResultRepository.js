const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'order', 'orderId', 'invoiceNumber', 'patient', 'uhid', 'test', 'testId',
  'specimenBarcode', 'department', 'status', 'pathologyResults',
  'radiologyReport', 'enteredBy', 'enteredAt', 'authorizedBy',
  'authorizedAt', 'digitalSignature', 'createdAt', 'updatedAt'
];

class DiagnosticResultRepository extends BaseMongoRepository {
  constructor() {
    super('diagnostic_results', COLUMNS, ID_PREFIXES.DIAGNOSTIC_RESULT, 'id');
  }
}

module.exports = DiagnosticResultRepository;
