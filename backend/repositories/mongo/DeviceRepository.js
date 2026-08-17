const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'deviceName', 'deviceType', 'deviceBrand', 'serialNumber', 'ipAddress',
  'port', 'location', 'departmentId', 'status', 'lastSyncTime', 'createdAt', 'updatedAt'
];

class DeviceRepository extends BaseMongoRepository {
  constructor() {
    super('attendance_devices', COLUMNS, ID_PREFIXES.DEVICE, 'id');
  }

  async findByIpAndPort(ipAddress, port) {
    return this.findOne({ ipAddress, port: Number(port) || 4370 });
  }

  async findBySerialNumber(serialNumber) {
    return this.findOne({ serialNumber });
  }
}

module.exports = DeviceRepository;
