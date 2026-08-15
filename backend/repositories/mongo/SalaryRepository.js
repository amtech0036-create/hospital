const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'employeeName', 'payMonth', 'baseSalary', 'bonus',
  'deductions', 'netPay', 'paymentMethod', 'status', 'paidDate',
  'note', 'createdBy', 'createdAt', 'updatedAt'
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
