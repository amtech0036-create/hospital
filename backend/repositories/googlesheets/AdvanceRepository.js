const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'employeeName', 'amount', 'advanceDate', 'reason',
  'installmentAmount', 'remainingBalance', 'status', 'createdAt', 'updatedAt'
];

class AdvanceRepository extends BaseSheetRepository {
  constructor() {
    super('Advances', COLUMNS, ID_PREFIXES.ADVANCE, 'id');
  }

  async findActiveByEmployee(employeeId) {
    const all = await this.findAll({ employeeId });
    return all.filter((a) => a.status === 'Active' && Number(a.remainingBalance) > 0);
  }
}

module.exports = AdvanceRepository;
