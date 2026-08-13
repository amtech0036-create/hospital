const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES, generateDateBasedId, formatDateForId, extractSequence } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'customerId',
  'saleDate',
  'subtotal',
  'discount',
  'total',
  'amountPaid',
  'paymentMethod',
  'status',
  'note',
  'createdBy',
  'createdAt',
  'updatedAt'
];

class SaleRepository extends BaseSheetRepository {
  constructor() {
    super('Sales', COLUMNS, ID_PREFIXES.INVOICE, 'id');
  }

  async _nextSequenceForDate(date = new Date()) {
    const rows = await this._readAll();
    const datePrefix = `${this.idPrefix}-${formatDateForId(date)}`;
    return rows.reduce((acc, r) => {
      const id = r.data[this.idColumn];
      if (!id || !id.startsWith(`${datePrefix}-`)) return acc;
      return Math.max(acc, extractSequence(id));
    }, 0);
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
