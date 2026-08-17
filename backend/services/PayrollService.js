const { salaryRepository, employeeRepository, leaveRepository, attendanceRepository, deviceRepository } = require('../repositories');
const EmployeeService = require('./EmployeeService');
const AdvanceService = require('./AdvanceService');

const PAYMENT_METHODS = ['Cash', 'Bank', 'Mobile Banking', 'Card', 'Other'];
const STATUSES = ['Pending', 'Paid'];

function roundMoney(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

function normalizePayMonth(value) {
  if (!value) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  }
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('payMonth must be in YYYY-MM format.');
    err.status = 422;
    throw err;
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function formatPayMonthLabel(payMonth) {
  if (!payMonth || !/^\d{4}-\d{2}$/.test(payMonth)) return payMonth || '';
  const [year, month] = payMonth.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

class PayrollService {
  async list({ employeeId, departmentId, payMonth, status, from, to } = {}) {
    let records = await salaryRepository.findAll();
    if (employeeId) records = records.filter((r) => r.employeeId === employeeId);
    if (departmentId) records = records.filter((r) => r.departmentId === departmentId);
    if (payMonth) records = records.filter((r) => r.payMonth === normalizePayMonth(payMonth));
    if (status) records = records.filter((r) => r.status === status);
    if (from) {
      const fromDate = new Date(from);
      records = records.filter((r) => r.paidDate && new Date(r.paidDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      records = records.filter((r) => r.paidDate && new Date(r.paidDate) <= toDate);
    }
    records.sort((a, b) => {
      const monthCmp = (b.payMonth || '').localeCompare(a.payMonth || '');
      if (monthCmp !== 0) return monthCmp;
      return new Date(b.paidDate || b.createdAt) - new Date(a.paidDate || a.createdAt);
    });
    return records;
  }

  async getById(id) {
    const record = await salaryRepository.findById(id);
    if (!record) {
      const err = new Error('Payroll record not found.');
      err.status = 404;
      throw err;
    }
    return record;
  }

  async _ensureUniquePayroll(employeeId, payMonth, excludeId = null) {
    const existing = await salaryRepository.findByEmployeeAndMonth(employeeId, payMonth);
    if (existing && existing.id !== excludeId) {
      const err = new Error(`Payroll for this employee in ${formatPayMonthLabel(payMonth)} already exists (${existing.id}).`);
      err.status = 409;
      throw err;
    }
  }

  calculateTotals(input, defaultBasic = 0) {
    const basicSalary = roundMoney(input.basicSalary !== undefined ? input.basicSalary : (input.baseSalary || defaultBasic));
    const houseRent = roundMoney(input.houseRent);
    const medical = roundMoney(input.medical);
    const transport = roundMoney(input.transport);
    const food = roundMoney(input.food);
    const overtime = roundMoney(input.overtime);
    const festivalBonus = roundMoney(input.festivalBonus || input.bonus);
    const performanceBonus = roundMoney(input.performanceBonus);
    const commission = roundMoney(input.commission);
    const otherAllowance = roundMoney(input.otherAllowance);

    const totalEarnings = roundMoney(
      basicSalary + houseRent + medical + transport + food + overtime + festivalBonus + performanceBonus + commission + otherAllowance
    );

    const absentDeduction = roundMoney(input.absentDeduction);
    const lateDeduction = roundMoney(input.lateDeduction);
    const advanceDeduction = roundMoney(input.advanceDeduction);
    const loanDeduction = roundMoney(input.loanDeduction);
    const taxDeduction = roundMoney(input.taxDeduction);
    const insuranceDeduction = roundMoney(input.insuranceDeduction);
    const otherDeductions = roundMoney(input.otherDeductions !== undefined ? input.otherDeductions : (input.deductions || 0));

    const totalDeductions = roundMoney(
      absentDeduction + lateDeduction + advanceDeduction + loanDeduction + taxDeduction + insuranceDeduction + otherDeductions
    );

    const netSalary = Math.max(0, roundMoney(totalEarnings - totalDeductions));

    return {
      basicSalary,
      houseRent,
      medical,
      transport,
      food,
      overtime,
      festivalBonus,
      performanceBonus,
      commission,
      otherAllowance,
      totalEarnings,
      absentDeduction,
      lateDeduction,
      advanceDeduction,
      loanDeduction,
      taxDeduction,
      insuranceDeduction,
      otherDeductions,
      totalDeductions,
      baseSalary: basicSalary,
      bonus: festivalBonus + performanceBonus,
      deductions: totalDeductions,
      netPay: netSalary,
      netSalary
    };
  }

  async create(input, { createdBy } = {}) {
    const {
      employeeId,
      payMonth: rawPayMonth,
      paymentMethod = 'Cash',
      note = '',
      paidDate
    } = input;

    const employee = await EmployeeService.getById(employeeId);
    if (employee.status !== 'Active') {
      const err = new Error('Payroll can only be processed for active employees.');
      err.status = 422;
      throw err;
    }

    const payMonth = normalizePayMonth(rawPayMonth);
    await this._ensureUniquePayroll(employeeId, payMonth);

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      const err = new Error(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
      err.status = 422;
      throw err;
    }

    // Auto-calculate auto advance deduction if not provided
    if (input.advanceDeduction === undefined) {
      input.advanceDeduction = await AdvanceService.getDeductionForPayroll(employeeId);
    }

    const calc = this.calculateTotals(input, employee.salary);

    const record = await salaryRepository.create({
      employeeId,
      employeeName: employee.name,
      designation: employee.designation || '',
      departmentId: employee.departmentId || '',
      departmentName: employee.departmentName || '',
      payMonth,
      ...calc,
      paymentMethod,
      status: 'Paid',
      paidDate: paidDate || new Date().toISOString(),
      note: String(note).trim(),
      createdBy: createdBy || 'unknown'
    });

    // Auto update remaining advance balance if advance deduction was applied
    if (calc.advanceDeduction > 0) {
      await AdvanceService.deductForPayroll(employeeId, calc.advanceDeduction);
    }

    return record;
  }

  async update(id, input, { updatedBy } = {}) {
    const existing = await this.getById(id);
    const employee = await EmployeeService.getById(existing.employeeId);

    const payMonth = input.payMonth ? normalizePayMonth(input.payMonth) : existing.payMonth;
    if (payMonth !== existing.payMonth) {
      await this._ensureUniquePayroll(existing.employeeId, payMonth, id);
    }

    const calc = this.calculateTotals({ ...existing, ...input }, employee.salary);

    return salaryRepository.update(id, {
      ...calc,
      payMonth,
      paymentMethod: input.paymentMethod || existing.paymentMethod,
      note: input.note !== undefined ? String(input.note).trim() : existing.note,
      updatedBy: updatedBy || 'unknown'
    });
  }

  async remove(id) {
    await this.getById(id);
    return salaryRepository.delete(id, { hard: true });
  }

  async createBulk(input, { createdBy } = {}) {
    const { payMonth: rawPayMonth, paymentMethod = 'Cash', note = '' } = input;
    const payMonth = normalizePayMonth(rawPayMonth);
    const employees = await EmployeeService.list({ status: 'Active' });

    const created = [];
    const skipped = [];

    for (const employee of employees) {
      const existing = await salaryRepository.findByEmployeeAndMonth(employee.id, payMonth);
      if (existing) {
        skipped.push({ employeeId: employee.id, employeeName: employee.name, reason: 'Already paid' });
        continue;
      }

      const baseSalary = roundMoney(employee.salary);
      if (!(baseSalary > 0)) {
        skipped.push({ employeeId: employee.id, employeeName: employee.name, reason: 'Salary not set' });
        continue;
      }

      const autoAdvance = await AdvanceService.getDeductionForPayroll(employee.id);

      const record = await this.create(
        {
          employeeId: employee.id,
          payMonth,
          basicSalary: baseSalary,
          advanceDeduction: autoAdvance,
          paymentMethod,
          note: note || `Bulk payroll for ${formatPayMonthLabel(payMonth)}`
        },
        { createdBy }
      );
      created.push(record);
    }

    return { payMonth, created, skipped };
  }

  async getDashboardStats() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const todayStr = now.toISOString().slice(0, 10);

    const [allEmployees, monthlySalaries, leaves, attendanceToday, allDevices] = await Promise.all([
      employeeRepository.findAll({ status: 'Active' }),
      salaryRepository.findAll({ payMonth: currentMonth }),
      leaveRepository.findAll({ status: 'Approved' }),
      attendanceRepository.findAll({ date: todayStr }),
      deviceRepository.findAll()
    ]);

    const paidEmpIds = new Set(monthlySalaries.map((s) => s.employeeId));
    const paidThisMonthCount = paidEmpIds.size;
    const pendingCount = Math.max(0, allEmployees.length - paidThisMonthCount);

    const totalPayrollExpenses = monthlySalaries.reduce((sum, s) => sum + Number(s.netSalary || s.netPay || 0), 0);
    const totalOvertimeExpenses = monthlySalaries.reduce((sum, s) => sum + Number(s.overtime || 0), 0);
    const totalDeductions = monthlySalaries.reduce((sum, s) => sum + Number(s.totalDeductions || s.deductions || 0), 0);

    // Active approved leave today
    const onLeaveCount = leaves.filter((l) => {
      return todayStr >= l.startDate && todayStr <= l.endDate;
    }).length;

    // Biometric Attendance Widget Metrics
    const presentCount = attendanceToday.filter((a) => a.status === 'Present' || a.attendanceStatus === 'Present').length;
    const lateCount = attendanceToday.filter((a) => a.status === 'Late' || a.attendanceStatus === 'Late').length;
    const absentCount = attendanceToday.filter((a) => a.status === 'Absent' || a.attendanceStatus === 'Absent').length;
    const totalOvertimeHoursToday = attendanceToday.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);

    const devicesOnline = allDevices.filter((d) => d.status === 'Online').length;
    const devicesOffline = allDevices.filter((d) => d.status === 'Offline' || d.status === 'Disabled').length;
    const lastSyncTimes = allDevices.map((d) => d.lastSyncTime).filter(Boolean);
    const lastSyncTime = lastSyncTimes.length ? lastSyncTimes.sort().reverse()[0] : '';

    return {
      totalEmployees: allEmployees.length,
      paidThisMonth: paidThisMonthCount,
      pendingSalaries: pendingCount,
      totalPayrollExpenses: roundMoney(totalPayrollExpenses),
      totalOvertimeExpenses: roundMoney(totalOvertimeExpenses),
      totalDeductions: roundMoney(totalDeductions),
      employeesOnLeave: onLeaveCount,
      employeesPresentToday: presentCount,
      employeesLateToday: lateCount,
      employeesAbsentToday: absentCount,
      totalOvertimeHoursToday: Math.round(totalOvertimeHoursToday * 10) / 10,
      devicesOnline,
      devicesOffline,
      lastSyncTime
    };
  }

  async hasPayrollForEmployee(employeeId) {
    const records = await salaryRepository.findByEmployee(employeeId);
    return records.length > 0;
  }
}

module.exports = new PayrollService();
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.STATUSES = STATUSES;
