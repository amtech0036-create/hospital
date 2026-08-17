const { shiftRepository } = require('../repositories');
const logger = require('../utils/logger');

class ShiftService {
  async list() {
    let shifts = await shiftRepository.findAll();
    if (!shifts.length) {
      // Seed default shifts if none exist
      const defaultShifts = [
        { shiftName: 'Morning Shift', startTime: '08:00', endTime: '16:00', breakTimeMinutes: 60, standardHours: 8, gracePeriodMinutes: 15, overtimePolicy: 'Standard', status: 'Active' },
        { shiftName: 'Evening Shift', startTime: '16:00', endTime: '00:00', breakTimeMinutes: 60, standardHours: 8, gracePeriodMinutes: 15, overtimePolicy: 'Standard', status: 'Active' },
        { shiftName: 'Night Shift', startTime: '00:00', endTime: '08:00', breakTimeMinutes: 60, standardHours: 8, gracePeriodMinutes: 15, overtimePolicy: 'Standard', status: 'Active' }
      ];

      for (const s of defaultShifts) {
        await shiftRepository.create(s);
      }
      shifts = await shiftRepository.findAll();
    }
    return shifts;
  }

  async getById(id) {
    const shift = await shiftRepository.findById(id);
    if (!shift) {
      const err = new Error('Shift not found.');
      err.status = 404;
      throw err;
    }
    return shift;
  }

  async create(input) {
    const {
      shiftName,
      startTime = '08:00',
      endTime = '17:00',
      breakTimeMinutes = 60,
      standardHours = 8,
      gracePeriodMinutes = 15,
      overtimePolicy = 'Standard',
      status = 'Active'
    } = input;

    if (!shiftName || !shiftName.trim()) {
      const err = new Error('Shift Name is required.');
      err.status = 400;
      throw err;
    }

    const shift = await shiftRepository.create({
      shiftName: shiftName.trim(),
      startTime,
      endTime,
      breakTimeMinutes: Number(breakTimeMinutes) || 0,
      standardHours: Number(standardHours) || 8,
      gracePeriodMinutes: Number(gracePeriodMinutes) || 15,
      overtimePolicy,
      status
    });

    logger.info(`Created new work shift: ${shift.shiftName} (${shift.id})`);
    return shift;
  }

  async update(id, input) {
    await this.getById(id);
    return shiftRepository.update(id, {
      ...input,
      breakTimeMinutes: input.breakTimeMinutes ? Number(input.breakTimeMinutes) : undefined,
      standardHours: input.standardHours ? Number(input.standardHours) : undefined,
      gracePeriodMinutes: input.gracePeriodMinutes ? Number(input.gracePeriodMinutes) : undefined
    });
  }

  async remove(id) {
    await this.getById(id);
    return shiftRepository.delete(id, { hard: true });
  }
}

module.exports = new ShiftService();
