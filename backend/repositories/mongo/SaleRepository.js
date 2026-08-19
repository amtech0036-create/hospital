const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES, generateDateBasedId, formatDateForId, extractSequence } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'customerId', 'saleDate', 'subtotal', 'discount', 'vatRate', 'vatAmount', 'total', 'amountPaid',
  'paymentMethod', 'status', 'note', 'createdBy', 'createdAt', 'updatedAt'
];

class SaleRepository extends BaseMongoRepository {
  constructor() {
    super('sales', COLUMNS, ID_PREFIXES.INVOICE, 'id');
  }

  async _nextSequenceForDate(date = new Date()) {
    const col = await this._collection();
    const datePrefix = `${this.idPrefix}-${formatDateForId(date)}`;
    const regex = new RegExp(`^${datePrefix.replace(/-/g, '\\-')}-\\d+$`);
    const docs = await col
      .find({ [this.idColumn]: regex })
      .project({ [this.idColumn]: 1 })
      .toArray();
    return docs.reduce((acc, d) => Math.max(acc, extractSequence(d[this.idColumn])), 0);
  }

  async _assignId(record) {
    const saleDate = record.saleDate ? new Date(record.saleDate) : new Date();
    const nextSeq = await this._nextSequenceForDate(saleDate);
    record[this.idColumn] = generateDateBasedId(this.idPrefix, saleDate, nextSeq);
  }

  async findByCustomer(customerId) {
    return this.findAll({ customerId });
  }
}

module.exports = SaleRepository;
