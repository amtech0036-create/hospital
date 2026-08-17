const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'employeeId', 'employeeName', 'designation', 'departmentId', 'departmentName', 'payMonth',
  'basicSalary', 'houseRent', 'medical', 'transport', 'food', 'overtime',
  'festivalBonus', 'performanceBonus', 'commission', 'otherAllowance', 'totalEarnings',
  'absentDeduction', 'lateDeduction', 'advanceDeduction', 'loanDeduction',
  'taxDeduction', 'insuranceDeduction', 'otherDeductions', 'totalDeductions',
  'baseSalary', 'bonus', 'deductions', 'netPay', 'netSalary',
  'paymentMethod', 'status', 'paidDate', 'note', 'createdBy', 'createdAt', 'updatedAt'
];

class SalaryRepository extends BaseMongoRepository {
  constructor() {
    super('salaries', COLUMNS, ID_PREFIXES.SALARY, 'id');
  }

  async findByEmployeeAndMonth(employeeId, payMonth) {
    return this.findOne({ employeeId, payMonth });
  }

  async findByEmployee(employeeId) {
    return this.findAll({ employeeId });
  }
}

module.exports = SalaryRepository;
