const {
  purchaseRepository,
  purchaseItemRepository,
  purchaseReturnRepository,
  purchaseReturnItemRepository,
  productRepository,
  stockTransactionRepository
} = require('../repositories');
const SupplierService = require('./SupplierService');
const StockService = require('./StockService');

const PAYMENT_METHODS = ['Cash', 'Bank', 'Credit'];
const STATUSES = ['Completed', 'Cancelled'];

function roundMoney(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

class PurchaseService {
  async list({ supplierId, status, from, to } = {}) {
    let purchases = await purchaseRepository.findAll(status ? { status } : {});
    if (supplierId) purchases = purchases.filter((p) => p.supplierId === supplierId);

    if (from) {
      const fromDate = new Date(from);
      purchases = purchases.filter((p) => new Date(p.purchaseDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      purchases = purchases.filter((p) => new Date(p.purchaseDate) <= toDate);
    }

    purchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    return purchases;
  }

  async getById(id) {
    const purchase = await purchaseRepository.findById(id);
    if (!purchase) {
      const err = new Error('Purchase not found.');
      err.status = 404;
      throw err;
    }
    const items = await purchaseItemRepository.findByPurchase(id);
    return { ...purchase, items };
  }

  async create(input, { createdBy } = {}) {
    const {
      supplierId,
      purchaseDate,
      discount = 0,
      amountPaid = 0,
      paymentMethod = 'Credit',
      note = '',
      items
    } = input;

    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('At least one line item is required.');
      err.status = 422;
      throw err;
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      const err = new Error(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
      err.status = 422;
      throw err;
    }

    await SupplierService.getById(supplierId);

    const lineRecords = [];
    let subtotal = 0;

    for (const line of items) {
      const product = await productRepository.findById(line.productId);
      if (!product || product.status !== 'Active') {
        const err = new Error(`Product not found or inactive: ${line.productId}`);
        err.status = 422;
        throw err;
      }

      const qty = parseFloat(line.quantity);
      if (!(qty > 0)) {
        const err = new Error('Each line item quantity must be positive.');
        err.status = 422;
        throw err;
      }

      const unitCost = roundMoney(line.unitCost != null ? line.unitCost : product.purchasePrice);
      const lineTotal = roundMoney(qty * unitCost);
      subtotal += lineTotal;

      lineRecords.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitCost,
        lineTotal
      });
    }

    subtotal = roundMoney(subtotal);
    const discountAmount = roundMoney(discount);
    if (discountAmount > subtotal) {
      const err = new Error('discount cannot exceed subtotal.');
      err.status = 422;
      throw err;
    }

    const total = roundMoney(subtotal - discountAmount);
    const paid = roundMoney(amountPaid);
    if (paid < 0 || paid > total) {
      const err = new Error('amountPaid must be between 0 and total.');
      err.status = 422;
      throw err;
    }

    const txnDate = purchaseDate || new Date().toISOString();

    const purchase = await purchaseRepository.create({
      supplierId,
      purchaseDate: txnDate,
      subtotal,
      discount: discountAmount,
      total,
      amountPaid: paid,
      paymentMethod,
      status: 'Completed',
      note,
      createdBy: createdBy || 'unknown'
    });

    for (const line of lineRecords) {
      await purchaseItemRepository.create({ purchaseId: purchase.id, ...line });

      await StockService.recordTransaction({
        productId: line.productId,
        type: 'Purchase',
        quantity: line.quantity,
        referenceType: 'Purchase',
        referenceId: purchase.id,
        note: `Purchase ${purchase.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await SupplierService.recordTransaction({
      supplierId,
      type: 'Purchase',
      amount: total,
      referenceType: 'Purchase',
      referenceId: purchase.id,
      note: note || `Purchase ${purchase.id}`,
      createdBy: createdBy || 'unknown',
      transactionDate: txnDate
    });

    if (paid > 0) {
      await SupplierService.recordTransaction({
        supplierId,
        type: 'Payment Made',
        amount: paid,
        referenceType: 'Purchase',
        referenceId: purchase.id,
        note: `Payment on ${purchase.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    return this.getById(purchase.id);
  }

  async sumForDate(date = new Date()) {
    const day = date.toDateString();
    const purchases = await purchaseRepository.findAll({ status: 'Completed' });
    return purchases
      .filter((p) => new Date(p.purchaseDate).toDateString() === day)
      .reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
  }

  async _returnedQtyByProduct(purchaseId) {
    const returns = await purchaseReturnRepository.findByPurchase(purchaseId);
    const totals = {};
    for (const ret of returns) {
      if (ret.status === 'Cancelled') continue;
      const items = await purchaseReturnItemRepository.findByPurchaseReturn(ret.id);
      for (const item of items) {
        totals[item.productId] = (totals[item.productId] || 0) + (parseFloat(item.quantity) || 0);
      }
    }
    return totals;
  }

  async listReturns(purchaseId) {
    await this.getById(purchaseId);
    const returns = await purchaseReturnRepository.findByPurchase(purchaseId);
    const enriched = [];
    for (const ret of returns) {
      const items = await purchaseReturnItemRepository.findByPurchaseReturn(ret.id);
      enriched.push({ ...ret, items });
    }
    return enriched.sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));
  }

  async createReturn(purchaseId, input, { createdBy } = {}) {
    const purchase = await this.getById(purchaseId);
    if (purchase.status === 'Cancelled') {
      const err = new Error('Cannot return items from a cancelled purchase.');
      err.status = 422;
      throw err;
    }

    const { items, note = '', returnDate } = input;
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('At least one return line is required.');
      err.status = 422;
      throw err;
    }

    const purchaseItems = purchase.items;
    const purchaseItemByProduct = Object.fromEntries(purchaseItems.map((i) => [i.productId, i]));
    const alreadyReturned = await this._returnedQtyByProduct(purchaseId);
    const stockByProduct = await stockTransactionRepository.computeCurrentStockForAll();

    const lineRecords = [];
    let subtotal = 0;

    for (const line of items) {
      const bought = purchaseItemByProduct[line.productId];
      if (!bought) {
        const err = new Error(`Product ${line.productId} was not on this purchase.`);
        err.status = 422;
        throw err;
      }

      const qty = parseFloat(line.quantity);
      if (!(qty > 0)) {
        const err = new Error('Return quantity must be positive.');
        err.status = 422;
        throw err;
      }

      const boughtQty = parseFloat(bought.quantity);
      const prevReturned = alreadyReturned[line.productId] || 0;
      if (qty + prevReturned > boughtQty) {
        const err = new Error(
          `Cannot return ${qty} of ${bought.productName}. Purchased: ${boughtQty}, already returned: ${prevReturned}.`
        );
        err.status = 422;
        throw err;
      }

      const available = stockByProduct[bought.productId] || 0;
      if (qty > available) {
        const err = new Error(`Insufficient stock to return ${bought.productName}. Available: ${available}.`);
        err.status = 422;
        throw err;
      }

      const unitCost = roundMoney(bought.unitCost);
      const lineTotal = roundMoney(qty * unitCost);
      subtotal += lineTotal;

      lineRecords.push({
        productId: bought.productId,
        productName: bought.productName,
        quantity: qty,
        unitCost,
        lineTotal
      });
    }

    subtotal = roundMoney(subtotal);
    const discountRatio =
      parseFloat(purchase.subtotal) > 0 ? (parseFloat(purchase.discount) || 0) / parseFloat(purchase.subtotal) : 0;
    const total = roundMoney(subtotal - subtotal * discountRatio);
    const txnDate = returnDate || new Date().toISOString();

    const purchaseReturn = await purchaseReturnRepository.create({
      purchaseId,
      supplierId: purchase.supplierId,
      returnDate: txnDate,
      subtotal,
      total,
      note,
      status: 'Completed',
      createdBy: createdBy || 'unknown'
    });

    for (const line of lineRecords) {
      await purchaseReturnItemRepository.create({ purchaseReturnId: purchaseReturn.id, ...line });

      await StockService.recordTransaction({
        productId: line.productId,
        type: 'Purchase Return',
        quantity: line.quantity,
        referenceType: 'Purchase Return',
        referenceId: purchaseReturn.id,
        note: `Return on ${purchase.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await SupplierService.recordTransaction({
      supplierId: purchase.supplierId,
      type: 'Purchase Return',
      amount: total,
      referenceType: 'Purchase Return',
      referenceId: purchaseReturn.id,
      note: note || `Return on ${purchase.id}`,
      createdBy: createdBy || 'unknown',
      transactionDate: txnDate
    });

    return {
      ...(await purchaseReturnRepository.findById(purchaseReturn.id)),
      items: await purchaseReturnItemRepository.findByPurchaseReturn(purchaseReturn.id)
    };
  }

  async cancel(id, { createdBy } = {}) {
    const purchase = await this.getById(id);
    if (purchase.status === 'Cancelled') {
      const err = new Error('Purchase is already cancelled.');
      err.status = 422;
      throw err;
    }

    const returned = await this._returnedQtyByProduct(id);
    const hasReturns = Object.values(returned).some((q) => q > 0);
    if (hasReturns) {
      const err = new Error('Cannot cancel a purchase that already has returns.');
      err.status = 409;
      throw err;
    }

    const txnDate = new Date().toISOString();

    for (const line of purchase.items) {
      await StockService.recordTransaction({
        productId: line.productId,
        type: 'Purchase Return',
        quantity: line.quantity,
        referenceType: 'Purchase',
        referenceId: purchase.id,
        note: `Purchase ${purchase.id} cancelled`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await SupplierService.recordTransaction({
      supplierId: purchase.supplierId,
      type: 'Purchase Return',
      amount: purchase.total,
      referenceType: 'Purchase',
      referenceId: purchase.id,
      note: `Purchase ${purchase.id} cancelled`,
      createdBy: createdBy || 'unknown',
      transactionDate: txnDate
    });

    const paid = parseFloat(purchase.amountPaid) || 0;
    if (paid > 0) {
      await SupplierService.recordTransaction({
        supplierId: purchase.supplierId,
        type: 'Adjustment Increase',
        amount: paid,
        referenceType: 'Purchase',
        referenceId: purchase.id,
        note: `Reverse payment on cancelled purchase ${purchase.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await purchaseRepository.update(id, { status: 'Cancelled' });
    return this.getById(id);
  }
}

module.exports = new PurchaseService();
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.STATUSES = STATUSES;
