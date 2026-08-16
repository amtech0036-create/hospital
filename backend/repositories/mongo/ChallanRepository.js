const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'customerId', 'saleId', 'challanDate', 'status', 'note',
  'deductStock', 'senderPhone', 'senderAddress', 'receiverPhone', 'receiverAddress',
  'createdBy', 'createdAt', 'updatedAt'
];

class ChallanRepository extends BaseMongoRepository {
  constructor() {
    super('challans', COLUMNS, ID_PREFIXES.CHALLAN, 'id');
  }

  async findBySale(saleId) {
    return this.findAll({ saleId });
  }
}

module.exports = ChallanRepository;
