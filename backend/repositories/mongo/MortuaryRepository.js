const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'mortuaryId', 'patientId', 'uhid', 'deceasedName', 
  'dateOfDeath', 'causeOfDeath', 'chamberNumber', 'authorizedRecipient', 
  'releaseStatus', 'status', 'createdAt', 'updatedAt'
];

class MortuaryRepository extends BaseMongoRepository {
  constructor() {
    super('mortuary_records', COLUMNS, ID_PREFIXES.MORTUARY || 'MORT', 'id');
  }
}

module.exports = MortuaryRepository;
