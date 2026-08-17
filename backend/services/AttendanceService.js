const { attendanceRepository, employeeRepository, shiftRepository, biometricEmployeeRepository } = require('../repositories');
const logger = require('../utils/logger');

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half-day', 'Leave', 'Holiday'];

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function computeAttendanceMetrics({ checkIn, checkOut, shift, statusInput }) {
  let workingHours = 0;
  let overtimeHours = 0;
  let lateMinutes = 0;
  let attendanceStatus = statusInput || 'Present';

  const standardHours = shift ? (shift.standardHours || 8) : 8;
  const shiftStart = shift ? (shift.startTime || '08:00') : '08:00';
  const gracePeriod = shift ? (shift.gracePeriodMinutes || 15) : 15;

  if (checkIn && checkOut) {
    const inMins = parseTimeToMinutes(checkIn);
    const outMins = parseTimeToMinutes(checkOut);
    const diff = outMins - inMins;
    if (diff > 0) {
      workingHours = Math.round((diff / 60) * 10) / 10;
      overtimeHours = Math.max(0, Math.round((workingHours - standardHours) * 10) / 10);
    }
  }

  if (checkIn) {
    const inMins = parseTimeToMinutes(checkIn);
    const shiftStartMins = parseTimeToMinutes(shiftStart);
    const lateDiff = inMins - (shiftStartMins + gracePeriod);
    if (lateDiff > 0) {
      lateMinutes = lateDiff;
      if (attendanceStatus === 'Present') {
        attendanceStatus = 'Late';
      }
    }
  }

  if (workingHours > 0 && workingHours < (standardHours / 2) && attendanceStatus !== 'Absent') {
    attendanceStatus = 'Half-day';
  }

  if (!checkIn && !checkOut && statusInput === 'Absent') {
    attendanceStatus = 'Absent';
    workingHours = 0;
    overtimeHours = 0;
    lateMinutes = 0;
  }

  return {
    workingHours,
    overtimeHours,
    lateMinutes,
    attendanceStatus
  };
}

class AttendanceService {
  async list({ employeeId, date, from, to, status } = {}) {
    let records = await attendanceRepository.findAll();
    if (employeeId) records = records.filter((r) => r.employeeId === employeeId);
    if (date) records = records.filter((r) => r.date === date);
    if (status) records = records.filter((r) => r.status === status || r.attendanceStatus === status);
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
      deviceId = '',
      shiftId = '',
      date = new Date().toISOString().slice(0, 10),
      checkIn = '',
      checkOut = '',
      status = 'Present',
      workingHours: manualWorkHrs,
      overtimeHours: manualOtHrs,
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

    let shift = null;
    const bio = await biometricEmployeeRepository.findByEmployeeId(employeeId);
    const targetShiftId = shiftId || (bio ? bio.shiftId : '');
    if (targetShiftId) {
      try {
        shift = await shiftRepository.findById(targetShiftId);
      } catch (err) {
        shift = null;
      }
    }

    const computed = computeAttendanceMetrics({ checkIn, checkOut, shift, statusInput: status });
    const finalWorkHrs = manualWorkHrs !== undefined ? Number(manualWorkHrs) : computed.workingHours;
    const finalOtHrs = manualOtHrs !== undefined ? Number(manualOtHrs) : computed.overtimeHours;
    const finalStatus = computed.attendanceStatus;

    const existing = await attendanceRepository.findByEmployeeAndDate(employeeId, date);
    if (existing) {
      return attendanceRepository.update(existing.id, {
        deviceId: deviceId || existing.deviceId || '',
        shiftId: targetShiftId || existing.shiftId || '',
        checkIn: checkIn || existing.checkIn || '',
        checkOut: checkOut || existing.checkOut || '',
        status: finalStatus,
        attendanceStatus: finalStatus,
        workingHours: finalWorkHrs,
        overtimeHours: finalOtHrs,
        lateMinutes: computed.lateMinutes,
        note
      });
    }

    return attendanceRepository.create({
      employeeId,
      employeeName: employee.name,
      deviceId,
      shiftId: targetShiftId,
      date,
      checkIn,
      checkOut,
      status: finalStatus,
      attendanceStatus: finalStatus,
      workingHours: finalWorkHrs,
      overtimeHours: finalOtHrs,
      lateMinutes: computed.lateMinutes,
      note
    });
  }

  async autoProcessAbsences(targetDate = new Date().toISOString().slice(0, 10)) {
    const employees = await employeeRepository.findAll();
    const activeEmployees = employees.filter((e) => e.status === 'Active');
    const existingLogs = await attendanceRepository.findAll();

    let count = 0;
    for (const emp of activeEmployees) {
      const hasLog = existingLogs.some((r) => r.employeeId === emp.id && r.date === targetDate);
      if (!hasLog) {
        await attendanceRepository.create({
          employeeId: emp.id,
          employeeName: emp.name,
          date: targetDate,
          checkIn: '',
          checkOut: '',
          status: 'Absent',
          attendanceStatus: 'Absent',
          workingHours: 0,
          overtimeHours: 0,
          lateMinutes: 0,
          note: 'Auto-marked Absent (No punch log recorded)'
        });
        count++;
      }
    }
    logger.info(`Auto-marked ${count} absent employee(s) for ${targetDate}`);
    return { date: targetDate, absencesRecorded: count };
  }

  async remove(id) {
    await this.getById(id);
    return attendanceRepository.delete(id, { hard: true });
  }
}

module.exports = new AttendanceService();
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
