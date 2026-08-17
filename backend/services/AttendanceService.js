const { attendanceRepository, employeeRepository } = require('../repositories');

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half-day', 'Leave', 'Holiday'];

class AttendanceService {
  async list({ employeeId, date, from, to, status } = {}) {
    let records = await attendanceRepository.findAll();
    if (employeeId) records = records.filter((r) => r.employeeId === employeeId);
    if (date) records = records.filter((r) => r.date === date);
    if (status) records = records.filter((r) => r.status === status);
    if (from) {
      const f = new Date(from);
      records = records.filter((r) => new Date(r.date) >= f);
    }
    if (to) {
      const t = new Date(to);
      records = records.filter((r) => new Date(r.date) <= t);
    }
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    return records;
  }

  async getById(id) {
    const rec = await attendanceRepository.findById(id);
    if (!rec) {
      const err = new Error('Attendance record not found.');
      err.status = 404;
      throw err;
    }
    return rec;
  }

  async record(input) {
    const {
      employeeId,
      date = new Date().toISOString().slice(0, 10),
      checkIn = '',
      checkOut = '',
      status = 'Present',
      workingHours = 8,
      overtimeHours = 0,
      note = ''
    } = input;

    if (!ATTENDANCE_STATUSES.includes(status)) {
      const err = new Error(`status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`);
      err.status = 422;
      throw err;
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      const err = new Error('Employee not found.');
      err.status = 404;
      throw err;
    }

    const existing = await attendanceRepository.findByEmployeeAndDate(employeeId, date);
    if (existing) {
      return attendanceRepository.update(existing.id, {
        checkIn,
        checkOut,
        status,
        workingHours: Number(workingHours) || 0,
        overtimeHours: Number(overtimeHours) || 0,
        note
      });
    }

    return attendanceRepository.create({
      employeeId,
      employeeName: employee.name,
      date,
      checkIn,
      checkOut,
      status,
      workingHours: Number(workingHours) || 0,
      overtimeHours: Number(overtimeHours) || 0,
      note
    });
  }

  async remove(id) {
    await this.getById(id);
    return attendanceRepository.delete(id, { hard: true });
  }
}

module.exports = new AttendanceService();
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
