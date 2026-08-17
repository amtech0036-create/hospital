const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'fingerprintId', 'rfidCardNumber', 'deviceUserId',
  'departmentId', 'shiftId', 'status', 'createdAt', 'updatedAt'
];

class BiometricEmployeeRepository extends BaseSheetRepository {
  constructor() {
    super('BiometricEmployees', COLUMNS, ID_PREFIXES.BIOMETRIC, 'id');
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
