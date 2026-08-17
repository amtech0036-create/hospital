const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'employeeName', 'date', 'checkIn', 'checkOut',
  'status', 'workingHours', 'overtimeHours', 'note', 'createdAt', 'updatedAt'
];

class AttendanceRepository extends BaseMongoRepository {
  constructor() {
    super('attendance', COLUMNS, ID_PREFIXES.ATTENDANCE, 'id');
  }

  async findByEmployeeAndDate(employeeId, date) {
    return this.findOne({ employeeId, date });
  }
}

module.exports = AttendanceRepository;
