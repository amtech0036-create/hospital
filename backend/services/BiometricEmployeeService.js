const { biometricEmployeeRepository, employeeRepository } = require('../repositories');
const logger = require('../utils/logger');

class BiometricEmployeeService {
  async list() {
    return biometricEmployeeRepository.findAll();
  }

  async getByEmployeeId(employeeId) {
    return biometricEmployeeRepository.findByEmployeeId(employeeId);
  }

  async upsert(input) {
    const {
      employeeId,
      fingerprintId = '',
      rfidCardNumber = '',
      deviceUserId = '',
      departmentId = '',
      shiftId = '',
      status = 'Active'
    } = input;

    if (!employeeId) {
      const err = new Error('Employee ID is required.');
      err.status = 400;
      throw err;
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      const err = new Error('Employee not found.');
      err.status = 404;
      throw err;
    }

    const existing = await biometricEmployeeRepository.findByEmployeeId(employeeId);
    const payload = {
      employeeId,
      fingerprintId: fingerprintId.trim(),
      rfidCardNumber: rfidCardNumber.trim(),
      deviceUserId: deviceUserId.trim(),
      departmentId: departmentId.trim() || employee.departmentId || '',
      shiftId: shiftId.trim(),
      status
    };

    if (existing) {
      logger.info(`Updated biometric profile for employee ${employee.name} (${employeeId})`);
      return biometricEmployeeRepository.update(existing.id, payload);
    }

    logger.info(`Created biometric profile for employee ${employee.name} (${employeeId})`);
    return biometricEmployeeRepository.create(payload);
  }

  async remove(id) {
    return biometricEmployeeRepository.delete(id, { hard: true });
  }
}

module.exports = new BiometricEmployeeService();
