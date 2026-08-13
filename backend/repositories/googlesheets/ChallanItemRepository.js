const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'challanId',
  'productId',
  'productName',
  'quantity',
  'createdAt',
  'updatedAt'
];

class ChallanItemRepository extends BaseSheetRepository {
  constructor() {
    super('Challan_Items', COLUMNS, ID_PREFIXES.CHALLAN_ITEM, 'id');
  }

  async findByChallan(challanId) {
    return this.findAll({ challanId });
  }
}

module.exports = ChallanItemRepository;
