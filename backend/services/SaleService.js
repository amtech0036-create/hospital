const {
  saleRepository,
  saleItemRepository,
  saleReturnRepository,
  saleReturnItemRepository,
  productRepository,
  stockTransactionRepository
} = require('../repositories');
const CustomerService = require('./CustomerService');
const StockService = require('./StockService');

const PAYMENT_METHODS = ['Cash', 'Bank', 'Credit'];
const STATUSES = ['Completed', 'Cancelled'];

function roundMoney(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

class SaleService {
  async list({ customerId, status, from, to } = {}) {
    let sales = await saleRepository.findAll(status ? { status } : {});
    if (customerId) sales = sales.filter((s) => s.customerId === customerId);

    if (from) {
      const fromDate = new Date(from);
      sales = sales.filter((s) => new Date(s.saleDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      sales = sales.filter((s) => new Date(s.saleDate) <= toDate);
    }

    sales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
    return sales;
  }

  async getById(id) {
    const sale = await saleRepository.findById(id);
    if (!sale) {
      const err = new Error('Sale not found.');
      err.status = 404;
      throw err;
    }
    const items = await saleItemRepository.findBySale(id);
    return { ...sale, items };
  }

  async create(input, { createdBy } = {}) {
    const {
      customerId,
      saleDate,
      discount = 0,
      vatRate = 0,
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

    await CustomerService.getById(customerId);

    const stockByProduct = await stockTransactionRepository.computeCurrentStockForAll();
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

      const available = stockByProduct[product.id] || 0;
      if (qty > available) {
        const err = new Error(`Insufficient stock for ${product.name}. Available: ${available}, requested: ${qty}.`);
        err.status = 422;
        throw err;
      }

      const unitPrice = roundMoney(line.unitPrice != null ? line.unitPrice : product.sellingPrice);
      const unitCost = roundMoney(product.purchasePrice);
      const lineTotal = roundMoney(qty * unitPrice);
      subtotal += lineTotal;

      lineRecords.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
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

    const vat = roundMoney(vatRate);
    const baseAfterDiscount = Math.max(0, subtotal - discountAmount);
    const vatAmount = roundMoney(baseAfterDiscount * (vat / 100));
    const total = roundMoney(baseAfterDiscount + vatAmount);

    const paid = roundMoney(amountPaid);
    if (paid < 0 || paid > total) {
      const err = new Error('amountPaid must be between 0 and total.');
      err.status = 422;
      throw err;
    }

    const txnDate = saleDate || new Date().toISOString();

    const sale = await saleRepository.create({
      customerId,
      saleDate: txnDate,
      subtotal,
      discount: discountAmount,
      vatRate: vat,
      vatAmount,
      total,
      amountPaid: paid,
      paymentMethod,
      status: 'Completed',
      note,
      createdBy: createdBy || 'unknown'
    });

    for (const line of lineRecords) {
      await saleItemRepository.create({ saleId: sale.id, ...line });

      await StockService.recordTransaction({
        productId: line.productId,
        type: 'Sale',
        quantity: line.quantity,
        referenceType: 'Sale',
        referenceId: sale.id,
        note: `Sale ${sale.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await CustomerService.recordTransaction({
      customerId,
      type: 'Invoice',
      amount: total,
      referenceType: 'Sale',
      referenceId: sale.id,
      note: note || `Invoice ${sale.id}`,
      createdBy: createdBy || 'unknown',
      transactionDate: txnDate
    });

    if (paid > 0) {
      await CustomerService.recordTransaction({
        customerId,
        type: 'Payment Received',
        amount: paid,
        referenceType: 'Sale',
        referenceId: sale.id,
        note: `Payment on ${sale.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    return this.getById(sale.id);
  }

  /** Sum of completed sale totals for a given calendar day. */
  async sumForDate(date = new Date()) {
    const day = date.toDateString();
    const sales = await saleRepository.findAll({ status: 'Completed' });
    return sales
      .filter((s) => new Date(s.saleDate).toDateString() === day)
      .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
  }

  /** Gross profit (revenue − cost) for completed sales on a given day. */
  async grossProfitForDate(date = new Date()) {
    const day = date.toDateString();
    const sales = await saleRepository.findAll({ status: 'Completed' });
    const todaysSales = sales.filter((s) => new Date(s.saleDate).toDateString() === day);

    let profit = 0;
    for (const sale of todaysSales) {
      const items = await saleItemRepository.findBySale(sale.id);
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const revenue = parseFloat(item.lineTotal) || 0;
        const cost = qty * (parseFloat(item.unitCost) || 0);
        profit += revenue - cost;
      }
      profit -= parseFloat(sale.discount) || 0;
    }
    return roundMoney(profit);
  }

  async _returnedQtyByProduct(saleId) {
    const returns = await saleReturnRepository.findBySale(saleId);
    const totals = {};
    for (const ret of returns) {
      if (ret.status === 'Cancelled') continue;
      const items = await saleReturnItemRepository.findBySaleReturn(ret.id);
      for (const item of items) {
        totals[item.productId] = (totals[item.productId] || 0) + (parseFloat(item.quantity) || 0);
      }
    }
    return totals;
  }

  async listReturns(saleId) {
    await this.getById(saleId);
    const returns = await saleReturnRepository.findBySale(saleId);
    const enriched = [];
    for (const ret of returns) {
      const items = await saleReturnItemRepository.findBySaleReturn(ret.id);
      enriched.push({ ...ret, items });
    }
    return enriched.sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));
  }

  async createReturn(saleId, input, { createdBy } = {}) {
    const sale = await this.getById(saleId);
    if (sale.status === 'Cancelled') {
      const err = new Error('Cannot return items from a cancelled sale.');
      err.status = 422;
      throw err;
    }

    const { items, note = '', returnDate } = input;
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('At least one return line is required.');
      err.status = 422;
      throw err;
    }

    const saleItems = sale.items;
    const saleItemByProduct = Object.fromEntries(saleItems.map((i) => [i.productId, i]));
    const alreadyReturned = await this._returnedQtyByProduct(saleId);

    const lineRecords = [];
    let subtotal = 0;

    for (const line of items) {
      const sold = saleItemByProduct[line.productId];
      if (!sold) {
        const err = new Error(`Product ${line.productId} was not on this sale.`);
        err.status = 422;
        throw err;
      }

      const qty = parseFloat(line.quantity);
      if (!(qty > 0)) {
        const err = new Error('Return quantity must be positive.');
        err.status = 422;
        throw err;
      }

      const soldQty = parseFloat(sold.quantity);
      const prevReturned = alreadyReturned[line.productId] || 0;
      if (qty + prevReturned > soldQty) {
        const err = new Error(
          `Cannot return ${qty} of ${sold.productName}. Sold: ${soldQty}, already returned: ${prevReturned}.`
        );
        err.status = 422;
        throw err;
      }

      const unitPrice = roundMoney(sold.unitPrice);
      const lineTotal = roundMoney(qty * unitPrice);
      subtotal += lineTotal;

      lineRecords.push({
        productId: sold.productId,
        productName: sold.productName,
        quantity: qty,
        unitPrice,
        lineTotal
      });
    }

    subtotal = roundMoney(subtotal);
    const discountRatio =
      parseFloat(sale.subtotal) > 0 ? (parseFloat(sale.discount) || 0) / parseFloat(sale.subtotal) : 0;
    const total = roundMoney(subtotal - subtotal * discountRatio);
    const txnDate = returnDate || new Date().toISOString();

    const saleReturn = await saleReturnRepository.create({
      saleId,
      customerId: sale.customerId,
      returnDate: txnDate,
      subtotal,
      total,
      note,
      status: 'Completed',
      createdBy: createdBy || 'unknown'
    });

    for (const line of lineRecords) {
      await saleReturnItemRepository.create({ saleReturnId: saleReturn.id, ...line });

      await StockService.recordTransaction({
        productId: line.productId,
        type: 'Sales Return',
        quantity: line.quantity,
        referenceType: 'Sale Return',
        referenceId: saleReturn.id,
        note: `Return on ${sale.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await CustomerService.recordTransaction({
      customerId: sale.customerId,
      type: 'Sales Return',
      amount: total,
      referenceType: 'Sale Return',
      referenceId: saleReturn.id,
      note: note || `Return on ${sale.id}`,
      createdBy: createdBy || 'unknown',
      transactionDate: txnDate
    });

    return {
      ...(await saleReturnRepository.findById(saleReturn.id)),
      items: await saleReturnItemRepository.findBySaleReturn(saleReturn.id)
    };
  }

  async cancel(id, { createdBy } = {}) {
    const sale = await this.getById(id);
    if (sale.status === 'Cancelled') {
      const err = new Error('Sale is already cancelled.');
      err.status = 422;
      throw err;
    }

    const returned = await this._returnedQtyByProduct(id);
    const hasReturns = Object.values(returned).some((q) => q > 0);
    if (hasReturns) {
      const err = new Error('Cannot cancel a sale that already has returns. Process remaining returns instead.');
      err.status = 409;
      throw err;
    }

    const txnDate = new Date().toISOString();

    for (const line of sale.items) {
      await StockService.recordTransaction({
        productId: line.productId,
        type: 'Sales Return',
        quantity: line.quantity,
        referenceType: 'Sale',
        referenceId: sale.id,
        note: `Sale ${sale.id} cancelled`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await CustomerService.recordTransaction({
      customerId: sale.customerId,
      type: 'Sales Return',
      amount: sale.total,
      referenceType: 'Sale',
      referenceId: sale.id,
      note: `Sale ${sale.id} cancelled`,
      createdBy: createdBy || 'unknown',
      transactionDate: txnDate
    });

    const paid = parseFloat(sale.amountPaid) || 0;
    if (paid > 0) {
      await CustomerService.recordTransaction({
        customerId: sale.customerId,
        type: 'Adjustment Increase',
        amount: paid,
        referenceType: 'Sale',
        referenceId: sale.id,
        note: `Reverse payment on cancelled sale ${sale.id}`,
        createdBy: createdBy || 'unknown',
        transactionDate: txnDate
      });
    }

    await saleRepository.update(id, { status: 'Cancelled' });
    return this.getById(id);
  }
}

module.exports = new SaleService();
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.STATUSES = STATUSES;
