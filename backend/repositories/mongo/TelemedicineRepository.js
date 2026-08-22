const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'sessionRef', 'patientId', 'uhid', 'patientName', 
  'doctorName', 'appointmentDate', 'videoRoomUrl', 'prescriptionUrl', 
  'paymentStatus', 'status', 'createdAt', 'updatedAt'
];

class TelemedicineRepository extends BaseMongoRepository {
  constructor() {
    super('telemedicine_sessions', COLUMNS, ID_PREFIXES.TELEMEDICINE || 'TELE', 'id');
  }
}

module.exports = TelemedicineRepository;
