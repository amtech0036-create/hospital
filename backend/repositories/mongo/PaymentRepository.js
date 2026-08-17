const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES, generateId, extractSequence } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'receiptNumber', 'partyType', 'partyId', 'direction', 'amount',
  'previousDue', 'remainingDue', 'paymentMethod', 'referenceType', 'referenceId',
  'note', 'paymentDate', 'employeeId', 'createdBy', 'createdAt', 'updatedAt'
];

class PaymentRepository extends BaseMongoRepository {
  constructor() {
    super('payments', COLUMNS, ID_PREFIXES.PAYMENT, 'id');
  }

  async getNextReceiptNumber() {
    const all = await this.findAll();
    let maxSeq = 0;
    for (const item of all) {
      if (item.receiptNumber) {
        const seq = extractSequence(item.receiptNumber);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
    return generateId(ID_PREFIXES.RECEIPT, maxSeq);
  }
}

module.exports = PaymentRepository;
