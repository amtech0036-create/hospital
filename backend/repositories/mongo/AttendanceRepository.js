const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'employeeName', 'deviceId', 'shiftId', 'date', 'checkIn', 'checkOut',
  'status', 'attendanceStatus', 'workingHours', 'overtimeHours', 'lateMinutes', 'note', 'createdAt', 'updatedAt'
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
