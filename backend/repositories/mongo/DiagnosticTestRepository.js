const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'code', 'name', 'department', 'category', 'price',
  'sampleType', 'specimenContainer', 'parameters', 'radiologyDetails',
  'templateHtml', 'status', 'createdAt', 'updatedAt'
];

class DiagnosticTestRepository extends BaseMongoRepository {
  constructor() {
    super('diagnostic_tests', COLUMNS, ID_PREFIXES.DIAGNOSTIC_TEST, 'id');
  }
}

module.exports = DiagnosticTestRepository;
