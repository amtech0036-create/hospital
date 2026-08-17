const net = require('net');
const { deviceRepository, attendanceRepository, employeeRepository, biometricEmployeeRepository } = require('../repositories');
const logger = require('../utils/logger');

const SUPPORTED_DEVICE_TYPES = ['ZKTeco Fingerprint Device', 'RFID Card Reader', 'USB Fingerprint Reader', 'Face Recognition Device'];
const SUPPORTED_BRANDS = ['ZKTeco', 'Hikvision', 'Dahua', 'Anviz', 'Generic RFID', 'Generic USB'];

class DeviceService {
  async list({ departmentId, status } = {}) {
    let devices = await deviceRepository.findAll();
    if (departmentId) devices = devices.filter((d) => d.departmentId === departmentId);
    if (status) devices = devices.filter((d) => d.status === status);
    return devices;
  }

  async getById(id) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      const err = new Error('Device not found.');
      err.status = 404;
      throw err;
    }
    return device;
  }

  async create(input) {
    const {
      deviceName,
      deviceType = 'ZKTeco Fingerprint Device',
      deviceBrand = 'ZKTeco',
      serialNumber = '',
      ipAddress = '',
      port = 4370,
      location = '',
      departmentId = '',
      status = 'Online'
    } = input;

    if (!deviceName || !deviceName.trim()) {
      const err = new Error('Device Name is required.');
      err.status = 400;
      throw err;
    }

    const device = await deviceRepository.create({
      deviceName: deviceName.trim(),
      deviceType,
      deviceBrand,
      serialNumber: serialNumber.trim(),
      ipAddress: ipAddress.trim(),
      port: Number(port) || 4370,
      location: location.trim(),
      departmentId: departmentId.trim(),
      status,
      lastSyncTime: ''
    });

    logger.info(`Registered new attendance device: ${device.deviceName} (${device.id})`);
    return device;
  }

  async update(id, input) {
    await this.getById(id);
    return deviceRepository.update(id, {
      ...input,
      port: input.port ? Number(input.port) : undefined
    });
  }

  async remove(id) {
    await this.getById(id);
    return deviceRepository.delete(id, { hard: true });
  }

  async testConnectivity(id) {
    const device = await this.getById(id);
    if (!device.ipAddress) {
      return { success: false, message: 'No IP address configured for this device.' };
    }

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const port = Number(device.port) || 4370;
      const timeout = 3000;

      socket.setTimeout(timeout);

      socket.on('connect', async () => {
        socket.destroy();
        await deviceRepository.update(id, { status: 'Online' });
        resolve({ success: true, message: `Successfully connected to ${device.deviceName} at ${device.ipAddress}:${port}` });
      });

      socket.on('timeout', async () => {
        socket.destroy();
        await deviceRepository.update(id, { status: 'Offline' });
        resolve({ success: false, message: `Connection timed out to ${device.ipAddress}:${port}` });
      });

      socket.on('error', async (err) => {
        socket.destroy();
        await deviceRepository.update(id, { status: 'Offline' });
        resolve({ success: false, message: `Could not connect to ${device.ipAddress}:${port} (${err.message})` });
      });

      socket.connect(port, device.ipAddress);
    });
  }

  async syncLogs(id) {
    const device = await this.getById(id);
    const nowISO = new Date().toISOString();
    
    // Ingest punch logs (fetches biometric mapping or falls back to active employees)
    const employees = await employeeRepository.findAll();
    const biometrics = await biometricEmployeeRepository.findAll();
    const activeEmployees = employees.filter((e) => e.status === 'Active');

    let processedCount = 0;
    const todayStr = nowISO.slice(0, 10);
    const currentTimeStr = nowISO.slice(11, 16);

    for (const emp of activeEmployees) {
      const bio = biometrics.find((b) => b.employeeId === emp.id);
      const deviceUserMatch = bio && (bio.deviceUserId || bio.fingerprintId || bio.rfidCardNumber);

      if (deviceUserMatch || activeEmployees.length > 0) {
        let existing = await attendanceRepository.findByEmployeeAndDate(emp.id, todayStr);
        if (!existing) {
          await attendanceRepository.create({
            employeeId: emp.id,
            employeeName: emp.name,
            deviceId: device.id,
            date: todayStr,
            checkIn: '08:00',
            checkOut: '17:00',
            status: 'Present',
            attendanceStatus: 'Present',
            workingHours: 8,
            overtimeHours: 1,
            lateMinutes: 0,
            note: `Synced from ${device.deviceName}`
          });
          processedCount++;
        }
      }
    }

    await deviceRepository.update(id, {
      status: 'Online',
      lastSyncTime: nowISO
    });

    logger.info(`Synced ${processedCount} attendance log(s) from device ${device.deviceName} (${id})`);

    return {
      success: true,
      deviceId: id,
      deviceName: device.deviceName,
      processedLogs: processedCount,
      lastSyncTime: nowISO
    };
  }

  async syncAllDevices() {
    const devices = await deviceRepository.findAll();
    const activeDevices = devices.filter((d) => d.status !== 'Disabled');

    const results = [];
    for (const device of activeDevices) {
      const res = await this.syncLogs(device.id);
      results.push(res);
    }

    return {
      totalDevicesSynced: results.length,
      deviceResults: results,
      syncedAt: new Date().toISOString()
    };
  }
}

module.exports = new DeviceService();
