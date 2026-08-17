const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'employeeId', 'employeeName', 'amount', 'advanceDate', 'reason',
  'installmentAmount', 'remainingBalance', 'status', 'createdAt', 'updatedAt'
];

class AdvanceRepository extends BaseMongoRepository {
  constructor() {
    super('advances', COLUMNS, ID_PREFIXES.ADVANCE, 'id');
  }

  async findActiveByEmployee(employeeId) {
    const all = await this.findAll({ employeeId });
    return all.filter((a) => a.status === 'Active' && Number(a.remainingBalance) > 0);
  }
}

module.exports = AdvanceRepository;
