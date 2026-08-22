const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'anesthesiaId', 'surgeryRef', 'patientId', 'uhid', 
  'anesthetistName', 'anesthesiaType', 'preAssessment', 'intraOpLog', 
  'drugsAdministered', 'pacuRecovery', 'status', 'createdAt', 'updatedAt'
];

class AnesthesiaRepository extends BaseMongoRepository {
  constructor() {
    super('anesthesia_logs', COLUMNS, 'ANS', 'id');
  }
}

module.exports = AnesthesiaRepository;
