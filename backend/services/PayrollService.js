const { salaryRepository } = require('../repositories');
const EmployeeService = require('./EmployeeService');

const PAYMENT_METHODS = ['Cash', 'Bank'];
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
  async list({ employeeId, payMonth, status, from, to } = {}) {
    let records = await salaryRepository.findAll();
    if (employeeId) records = records.filter((r) => r.employeeId === employeeId);
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

  async _ensureUniquePayroll(employeeId, payMonth) {
    const existing = await salaryRepository.findByEmployeeAndMonth(employeeId, payMonth);
    if (existing) {
      const err = new Error(`Payroll for this employee in ${formatPayMonthLabel(payMonth)} already exists (${existing.id}).`);
      err.status = 409;
      throw err;
    }
  }

  _computeNetPay(baseSalary, bonus, deductions) {
    return roundMoney(Math.max(0, roundMoney(baseSalary) + roundMoney(bonus) - roundMoney(deductions)));
  }

  async create(input, { createdBy } = {}) {
    const {
      employeeId,
      payMonth: rawPayMonth,
      baseSalary: rawBaseSalary,
      bonus = 0,
      deductions = 0,
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

    const baseSalary = roundMoney(rawBaseSalary != null ? rawBaseSalary : employee.salary);
    const netPay = this._computeNetPay(baseSalary, bonus, deductions);
    if (!(netPay >= 0)) {
      const err = new Error('Net pay cannot be negative. Check bonus and deductions.');
      err.status = 422;
      throw err;
    }

    return salaryRepository.create({
      employeeId,
      employeeName: employee.name,
      payMonth,
      baseSalary,
      bonus: roundMoney(bonus),
      deductions: roundMoney(deductions),
      netPay,
      paymentMethod,
      status: 'Paid',
      paidDate: paidDate || new Date().toISOString(),
      note: String(note).trim(),
      createdBy: createdBy || 'unknown'
    });
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

      const record = await salaryRepository.create({
        employeeId: employee.id,
        employeeName: employee.name,
        payMonth,
        baseSalary,
        bonus: 0,
        deductions: 0,
        netPay: baseSalary,
        paymentMethod,
        status: 'Paid',
        paidDate: new Date().toISOString(),
        note: note || `Bulk payroll for ${formatPayMonthLabel(payMonth)}`,
        createdBy: createdBy || 'unknown'
      });
      created.push(record);
    }

    return { payMonth, created, skipped };
  }

  async hasPayrollForEmployee(employeeId) {
    const records = await salaryRepository.findByEmployee(employeeId);
    return records.length > 0;
  }
}

module.exports = new PayrollService();
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.STATUSES = STATUSES;
