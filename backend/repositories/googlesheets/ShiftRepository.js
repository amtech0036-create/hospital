const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'shiftName', 'startTime', 'endTime', 'breakTimeMinutes',
  'standardHours', 'gracePeriodMinutes', 'overtimePolicy', 'status', 'createdAt', 'updatedAt'
];

class ShiftRepository extends BaseSheetRepository {
  constructor() {
    super('Shifts', COLUMNS, ID_PREFIXES.SHIFT, 'id');
  }

  async findByName(shiftName) {
    return this.findOne({ shiftName });
  }
}

module.exports = ShiftRepository;
