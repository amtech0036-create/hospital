const { paymentRepository } = require('../repositories');
const CustomerService = require('./CustomerService');
const SupplierService = require('./SupplierService');

const PARTY_TYPES = ['Customer', 'Supplier'];
const DIRECTIONS = ['Received', 'Paid'];
const PAYMENT_METHODS = ['Cash', 'Bank', 'Mobile Banking', 'Card', 'Other'];

class PaymentService {
  async list({ partyType, partyId, from, to } = {}) {
    let payments = await paymentRepository.findAll();
    if (partyType) payments = payments.filter((p) => p.partyType === partyType);
    if (partyId) payments = payments.filter((p) => p.partyId === partyId);
    if (from) {
      const fromDate = new Date(from);
      payments = payments.filter((p) => new Date(p.paymentDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      payments = payments.filter((p) => new Date(p.paymentDate) <= toDate);
    }
    payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    return payments;
  }

  async getById(id) {
    let payment = await paymentRepository.findById(id);
    if (!payment) {
      // Try searching by receiptNumber if not found by primary id
      const all = await paymentRepository.findAll({ receiptNumber: id });
      payment = all[0];
    }
    if (!payment) {
      const err = new Error('Payment not found.');
      err.status = 404;
      throw err;
    }
    return payment;
  }

  async create(input, { createdBy, employeeId } = {}) {
    const {
      partyType,
      partyId,
      direction,
      amount,
      paymentMethod = 'Cash',
      referenceType = '',
      referenceId = '',
      note = '',
      paymentDate,
      receiptNumber: customReceiptNo,
      employeeId: customEmployeeId
    } = input;

    if (!PARTY_TYPES.includes(partyType)) {
      const err = new Error(`partyType must be one of: ${PARTY_TYPES.join(', ')}`);
      err.status = 422;
      throw err;
    }
    if (!DIRECTIONS.includes(direction)) {
      const err = new Error(`direction must be one of: ${DIRECTIONS.join(', ')}`);
      err.status = 422;
      throw err;
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      const err = new Error(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
      err.status = 422;
      throw err;
    }

    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      const err = new Error('amount must be a positive number.');
      err.status = 422;
      throw err;
    }

    if (partyType === 'Customer' && direction !== 'Received') {
      const err = new Error('Customer payments must have direction Received.');
      err.status = 422;
      throw err;
    }
    if (partyType === 'Supplier' && direction !== 'Paid') {
      const err = new Error('Supplier payments must have direction Paid.');
      err.status = 422;
      throw err;
    }

    await (partyType === 'Customer' ? CustomerService.getById(partyId) : SupplierService.getById(partyId));

    const previousDue = partyType === 'Customer'
      ? Number(await CustomerService.balance(partyId)) || 0
      : Number(await SupplierService.balance(partyId)) || 0;

    const remainingDue = Math.max(0, previousDue - amt);
    const receiptNumber = customReceiptNo || (await paymentRepository.getNextReceiptNumber());
    const empId = customEmployeeId || employeeId || createdBy || 'unknown';
    const txnDate = paymentDate || new Date().toISOString();

    const payment = await paymentRepository.create({
      receiptNumber,
      partyType,
      partyId,
      direction,
      amount: amt,
      previousDue,
      remainingDue,
      paymentMethod,
      referenceType: referenceType || 'Manual',
      referenceId: referenceId || '',
      note,
      paymentDate: txnDate,
      employeeId: empId,
      createdBy: createdBy || 'unknown'
    });

    if (partyType === 'Customer') {
      await CustomerService.recordTransaction({
        customerId: partyId,
        type: 'Payment Received',
        amount: amt,
        referenceType: 'Payment',
        referenceId: payment.id,
        note: note || `Payment ${receiptNumber}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    } else {
      await SupplierService.recordTransaction({
        supplierId: partyId,
        type: 'Payment Made',
        amount: amt,
        referenceType: 'Payment',
        referenceId: payment.id,
        note: note || `Payment ${receiptNumber}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    return payment;
  }
}

module.exports = new PaymentService();
module.exports.PARTY_TYPES = PARTY_TYPES;
module.exports.DIRECTIONS = DIRECTIONS;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
