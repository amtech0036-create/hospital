const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'shiftName', 'startTime', 'endTime', 'breakTimeMinutes',
  'standardHours', 'gracePeriodMinutes', 'overtimePolicy', 'status', 'createdAt', 'updatedAt'
];

class ShiftRepository extends BaseMongoRepository {
  constructor() {
    super('shifts', COLUMNS, ID_PREFIXES.SHIFT, 'id');
  }

  async findByName(shiftName) {
    return this.findOne({ shiftName });
  }
}

module.exports = ShiftRepository;
