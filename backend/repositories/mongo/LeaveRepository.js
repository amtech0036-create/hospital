const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'employeeName', 'leaveType', 'startDate', 'endDate',
  'days', 'reason', 'status', 'approvedBy', 'createdAt', 'updatedAt'
];

class LeaveRepository extends BaseMongoRepository {
  constructor() {
    super('leaves', COLUMNS, ID_PREFIXES.LEAVE, 'id');
  }

  async findByEmployee(employeeId) {
    return this.findAll({ employeeId });
  }
}

module.exports = LeaveRepository;
