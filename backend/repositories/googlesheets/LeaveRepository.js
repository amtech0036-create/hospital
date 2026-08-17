const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'employeeName', 'leaveType', 'startDate', 'endDate',
  'days', 'reason', 'status', 'approvedBy', 'createdAt', 'updatedAt'
];

class LeaveRepository extends BaseSheetRepository {
  constructor() {
    super('Leaves', COLUMNS, ID_PREFIXES.LEAVE, 'id');
  }

  async findByEmployee(employeeId) {
    return this.findAll({ employeeId });
  }
}

module.exports = LeaveRepository;
