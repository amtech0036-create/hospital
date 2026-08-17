const { advanceRepository, employeeRepository } = require('../repositories');

class AdvanceService {
  async list({ employeeId, status } = {}) {
    let advances = await advanceRepository.findAll();
    if (employeeId) advances = advances.filter((a) => a.employeeId === employeeId);
    if (status) advances = advances.filter((a) => a.status === status);
    advances.sort((a, b) => new Date(b.advanceDate) - new Date(a.advanceDate));
    return advances;
  }

  async getById(id) {
    const adv = await advanceRepository.findById(id);
    if (!adv) {
      const err = new Error('Salary advance record not found.');
      err.status = 404;
      throw err;
    }
    return adv;
  }

  async create(input) {
    const {
      employeeId,
      amount,
      advanceDate = new Date().toISOString().slice(0, 10),
      reason = '',
      installmentAmount
    } = input;

    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      const err = new Error('Advance amount must be a positive number.');
      err.status = 422;
      throw err;
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      const err = new Error('Employee not found.');
      err.status = 404;
      throw err;
    }

    const instAmt = parseFloat(installmentAmount) > 0 ? parseFloat(installmentAmount) : amt;

    return advanceRepository.create({
      employeeId,
      employeeName: employee.name,
      amount: amt,
      advanceDate,
      reason,
      installmentAmount: instAmt,
      remainingBalance: amt,
      status: 'Active'
    });
  }

  /**
   * Calculates total active advance installment due for an employee to deduct in current payroll.
   */
  async getDeductionForPayroll(employeeId) {
    const activeAdvances = await advanceRepository.findActiveByEmployee(employeeId);
    let totalDeduction = 0;
    activeAdvances.forEach((adv) => {
      const rem = Number(adv.remainingBalance || 0);
      const inst = Number(adv.installmentAmount || rem);
      totalDeduction += Math.min(rem, inst);
    });
    return Math.round(totalDeduction * 100) / 100;
  }

  /**
   * Applies deduction against active advance balances when salary is processed.
   */
  async deductForPayroll(employeeId, deductedAmount) {
    let toDeduct = Number(deductedAmount || 0);
    if (toDeduct <= 0) return;

    const activeAdvances = await advanceRepository.findActiveByEmployee(employeeId);
    for (const adv of activeAdvances) {
      if (toDeduct <= 0) break;
      const rem = Number(adv.remainingBalance || 0);
      const inst = Number(adv.installmentAmount || rem);
      const portion = Math.min(rem, inst, toDeduct);

      const newRem = Math.max(0, Math.round((rem - portion) * 100) / 100);
      const newStatus = newRem === 0 ? 'Completed' : 'Active';

      await advanceRepository.update(adv.id, {
        remainingBalance: newRem,
        status: newStatus
      });

      toDeduct = Math.max(0, Math.round((toDeduct - portion) * 100) / 100);
    }
  }

  async remove(id) {
    await this.getById(id);
    return advanceRepository.delete(id, { hard: true });
  }
}

module.exports = new AdvanceService();
