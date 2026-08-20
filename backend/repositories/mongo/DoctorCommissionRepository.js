const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'doctorName', 'orderId', 'invoiceNumber', 'uhid',
  'totalOrderAmount', 'commissionRate', 'commissionAmount', 'payoutStatus',
  'paidAt', 'paymentReference', 'createdAt', 'updatedAt'
];

class DoctorCommissionRepository extends BaseMongoRepository {
  constructor() {
    super('doctor_commissions', COLUMNS, 'DCOM', 'id');
  }
}

module.exports = DoctorCommissionRepository;
