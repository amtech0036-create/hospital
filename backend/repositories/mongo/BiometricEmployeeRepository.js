const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'employeeId', 'fingerprintId', 'rfidCardNumber', 'deviceUserId',
  'departmentId', 'shiftId', 'status', 'createdAt', 'updatedAt'
];

class BiometricEmployeeRepository extends BaseMongoRepository {
  constructor() {
    super('biometric_employees', COLUMNS, ID_PREFIXES.BIOMETRIC, 'id');
  }

  async findByEmployeeId(employeeId) {
    return this.findOne({ employeeId });
  }

  async findByFingerprintId(fingerprintId) {
    return this.findOne({ fingerprintId });
  }

  async findByRfidCardNumber(rfidCardNumber) {
    return this.findOne({ rfidCardNumber });
  }

  async findByDeviceUserId(deviceUserId) {
    return this.findOne({ deviceUserId });
  }
}

module.exports = BiometricEmployeeRepository;
