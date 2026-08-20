const BaseMongoRepository = require('./BaseMongoRepository');
const DoctorSchedule = require('../../models/DoctorSchedule');

class DoctorScheduleRepository extends BaseMongoRepository {
  constructor() {
    super('doctor_schedules', DoctorSchedule.columns, 'DSCH');
  }
}

module.exports = new DoctorScheduleRepository();
