const { supplierRepository, supplierTransactionRepository } = require('../repositories');

const VALID_TXN_TYPES = ['Opening Balance', 'Purchase', 'Payment Made', 'Purchase Return', 'Adjustment Increase', 'Adjustment Decrease'];

class SupplierService {
  async list({ status, search } = {}) {
    let suppliers = await supplierRepository.findAll(status ? { status } : {});

    if (search) {
      const q = search.toLowerCase();
      suppliers = suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone || '').includes(q) ||
          (s.email || '').toLowerCase().includes(q)
      );
    }

    const balances = await supplierTransactionRepository.computeBalanceForAll();
    return suppliers.map((s) => ({ ...s, balanceDue: balances[s.id] || 0 }));
  }

  async getById(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      const err = new Error('Supplier not found.');
      err.status = 404;
      throw err;
    }
    const balanceDue = await supplierTransactionRepository.computeBalance(id);
    return { ...supplier, balanceDue };
  }

  async create(input) {
    const { name, phone, email, address, openingBalance } = input;

    const supplier = await supplierRepository.create({
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      openingBalance: openingBalance || 0,
      status: 'Active'
    });

    // Opening balance must go through the ledger, never a raw field write.
    if (parseFloat(openingBalance) > 0) {
      await supplierTransactionRepository.create({
        supplierId: supplier.id,
        type: 'Opening Balance',
        amount: openingBalance,
        referenceType: 'Supplier Creation',
        referenceId: supplier.id,
        note: 'Opening balance recorded at supplier creation',
        transactionDate: new Date().toISOString()
      });
    }

    return this.getById(supplier.id);
  }

  async update(id, input) {
    await this.getById(id); // throws 404 if missing
    const updated = await supplierRepository.update(id, input);
    return this.getById(updated.id);
  }

  async remove(id, { hard = false } = {}) {
    await this.getById(id);

    if (hard) {
      const history = await supplierTransactionRepository.findBySupplier(id);
      if (history.length > 0) {
        const err = new Error(
          'This supplier has ledger history and cannot be permanently deleted. Deactivate instead to keep records intact.'
        );
        err.status = 409;
        throw err;
      }
      return supplierRepository.delete(id, { hard: true });
    }

    return supplierRepository.delete(id); // soft delete -> status = Inactive
  }

  async recordTransaction({ supplierId, type, amount, referenceType, referenceId, note, createdBy, transactionDate }) {
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

    await this.getById(supplierId); // throws 404 if missing

    return supplierTransactionRepository.create({
      supplierId,
      type,
      amount,
      referenceType: referenceType || 'Manual',
      referenceId: referenceId || '',
      note: note || '',
      createdBy: createdBy || 'unknown',
      transactionDate: transactionDate || new Date().toISOString()
    });
  }

  async transactionHistory(supplierId) {
    const txns = await supplierTransactionRepository.findBySupplier(supplierId);
    return txns.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  }

  async balance(supplierId) {
    return supplierTransactionRepository.computeBalance(supplierId);
  }
}

module.exports = new SupplierService();
module.exports.VALID_TXN_TYPES = VALID_TXN_TYPES;
