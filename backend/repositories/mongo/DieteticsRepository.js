const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'dietId', 'patientId', 'uhid', 'patientName', 
  'dieticianName', 'dietPlanType', 'mealSchedule', 'allergiesDiet', 
  'status', 'createdAt', 'updatedAt'
];

class DieteticsRepository extends BaseMongoRepository {
  constructor() {
    super('dietetics_records', COLUMNS, ID_PREFIXES.DIETETICS || 'DIET', 'id');
  }
}

module.exports = DieteticsRepository;
