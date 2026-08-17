const { customerRepository, customerTransactionRepository } = require('../repositories');

const VALID_TXN_TYPES = ['Opening Balance', 'Invoice', 'Payment Received', 'Sales Return', 'Adjustment Increase', 'Adjustment Decrease'];

class CustomerService {
  async list({ status, search } = {}) {
    let customers = await customerRepository.findAll(status ? { status } : {});

    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      );
    }

    const balances = await customerTransactionRepository.computeBalanceForAll();
    return customers.map((c) => ({ ...c, balanceDue: balances[c.id] || 0 }));
  }

  async getById(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      const err = new Error('Customer not found.');
      err.status = 404;
      throw err;
    }
    const balanceDue = await customerTransactionRepository.computeBalance(id);
    return { ...customer, balanceDue };
  }

  async create(input) {
    const { name, phone, email, address, openingBalance } = input;

    const customer = await customerRepository.create({
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      openingBalance: openingBalance || 0,
      status: 'Active'
    });

    // Opening balance must go through the ledger, never a raw field write.
    if (parseFloat(openingBalance) > 0) {
      await customerTransactionRepository.create({
        customerId: customer.id,
        type: 'Opening Balance',
        amount: openingBalance,
        referenceType: 'Customer Creation',
        referenceId: customer.id,
        note: 'Opening balance recorded at customer creation',
        transactionDate: new Date().toISOString()
      });
    }

    return this.getById(customer.id);
  }

  async update(id, input) {
    await this.getById(id); // throws 404 if missing
    const updated = await customerRepository.update(id, input);
    return this.getById(updated.id);
  }

  async remove(id, { hard = false } = {}) {
    await this.getById(id);

    if (hard) {
      const history = await customerTransactionRepository.findByCustomer(id);
      if (history.length > 0) {
        const err = new Error(
          'This customer has ledger history and cannot be permanently deleted. Deactivate instead to keep records intact.'
        );
        err.status = 409;
        throw err;
      }
      return customerRepository.delete(id, { hard: true });
    }

    return customerRepository.delete(id); // soft delete -> status = Inactive
  }

  async recordTransaction({ customerId, type, amount, paymentMethod, referenceType, referenceId, note, createdBy, transactionDate }) {
    if (!VALID_TXN_TYPES.includes(type)) {
      const err = new Error(`type must be one of: ${VALID_TXN_TYPES.join(', ')}`);
      err.status = 422;
      throw err;
    }
    if (!(parseFloat(amount) > 0)) {
      const err = new Error('amount must be a positive number.');
      err.status = 422;
      throw err;
    }

    await this.getById(customerId); // throws 404 if missing

    if (type === 'Payment Received' && referenceType !== 'Payment') {
      const PaymentService = require('./PaymentService');
      return PaymentService.create(
        {
          partyType: 'Customer',
          partyId: customerId,
          direction: 'Received',
          amount,
          paymentMethod: paymentMethod || 'Cash',
          note,
          paymentDate: transactionDate
        },
        { createdBy }
      );
    }

    return customerTransactionRepository.create({
      customerId,
      type,
      amount,
      referenceType: referenceType || 'Manual',
      referenceId: referenceId || '',
      note: note || '',
      createdBy: createdBy || 'unknown',
      transactionDate: transactionDate || new Date().toISOString()
    });
  }

  async transactionHistory(customerId) {
    const txns = await customerTransactionRepository.findByCustomer(customerId);
    return txns.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  }

  async balance(customerId) {
    return customerTransactionRepository.computeBalance(customerId);
  }
}

module.exports = new CustomerService();
module.exports.VALID_TXN_TYPES = VALID_TXN_TYPES;
