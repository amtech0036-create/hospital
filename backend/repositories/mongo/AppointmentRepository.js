const BaseMongoRepository = require('./BaseMongoRepository');
const Appointment = require('../../models/Appointment');

class AppointmentRepository extends BaseMongoRepository {
  constructor() {
    super('appointments', Appointment.columns, 'APT');
  }
}

module.exports = new AppointmentRepository();
