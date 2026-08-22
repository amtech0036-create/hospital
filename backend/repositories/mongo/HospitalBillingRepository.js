const BaseMongoRepository = require('./BaseMongoRepository');
const { ID_PREFIXES } = require('../../utils/idGenerator');

const COLUMNS = [
  'id', 'tenantId', 'invoiceId', 'patientId', 'uhid', 'patientName', 
  'departmentBreakdown', 'totalAmount', 'discount', 'netAmount', 
  'paidAmount', 'dueAmount', 'paymentStatus', 'paymentMethod', 
  'cashierId', 'remarks', 'createdAt', 'updatedAt'
];

class HospitalBillingRepository extends BaseMongoRepository {
  constructor() {
    super('hospital_invoices', COLUMNS, ID_PREFIXES.BILLING, 'id');
  }
}

module.exports = HospitalBillingRepository;
