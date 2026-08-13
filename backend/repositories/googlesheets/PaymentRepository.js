const BaseSheetRepository = require('./BaseSheetRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id',
  'partyType',
  'partyId',
  'direction',
  'amount',
  'paymentMethod',
  'referenceType',
  'referenceId',
  'note',
  'paymentDate',
  'createdBy',
  'createdAt',
  'updatedAt'
];

class PaymentRepository extends BaseSheetRepository {
  constructor() {
    super('Payments', COLUMNS, ID_PREFIXES.PAYMENT, 'id');
  }
}

module.exports = PaymentRepository;
