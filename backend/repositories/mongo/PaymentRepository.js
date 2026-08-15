const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'partyType', 'partyId', 'direction', 'amount', 'paymentMethod',
  'referenceType', 'referenceId', 'note', 'paymentDate', 'createdBy', 'createdAt', 'updatedAt'
];

class PaymentRepository extends BaseMongoRepository {
  constructor() {
    super('payments', COLUMNS, ID_PREFIXES.PAYMENT, 'id');
  }
}

module.exports = PaymentRepository;
