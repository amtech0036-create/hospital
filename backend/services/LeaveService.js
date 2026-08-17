const { leaveRepository, employeeRepository } = require('../repositories');

const LEAVE_TYPES = ['Casual leave', 'Sick leave', 'Annual leave', 'Unpaid leave'];
const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];

class LeaveService {
  async list({ employeeId, status, leaveType } = {}) {
    let leaves = await leaveRepository.findAll();
    if (employeeId) leaves = leaves.filter((l) => l.employeeId === employeeId);
    if (status) leaves = leaves.filter((l) => l.status === status);
    if (leaveType) leaves = leaves.filter((l) => l.leaveType === leaveType);
    leaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    return leaves;
  }

  async getById(id) {
    const leave = await leaveRepository.findById(id);
    if (!leave) {
      const err = new Error('Leave request not found.');
      err.status = 404;
      throw err;
    }
    return leave;
  }

  async create(input) {
    const { employeeId, leaveType, startDate, endDate, days, reason } = input;

    if (!LEAVE_TYPES.includes(leaveType)) {
      const err = new Error(`leaveType must be one of: ${LEAVE_TYPES.join(', ')}`);
      err.status = 422;
      throw err;
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      const err = new Error('Employee not found.');
      err.status = 404;
      throw err;
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const numDays = days || Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    return leaveRepository.create({
      employeeId,
      employeeName: employee.name,
      leaveType,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      days: numDays,
      reason: reason || '',
      status: 'Pending',
      approvedBy: ''
    });
  }

  async updateStatus(id, { status, approvedBy = '' }) {
    if (!LEAVE_STATUSES.includes(status)) {
      const err = new Error(`status must be one of: ${LEAVE_STATUSES.join(', ')}`);
      err.status = 422;
      throw err;
    }

    await this.getById(id);
    return leaveRepository.update(id, { status, approvedBy });
  }

  async remove(id) {
    await this.getById(id);
    return leaveRepository.delete(id, { hard: true });
  }
}

module.exports = new LeaveService();
module.exports.LEAVE_TYPES = LEAVE_TYPES;
module.exports.LEAVE_STATUSES = LEAVE_STATUSES;
