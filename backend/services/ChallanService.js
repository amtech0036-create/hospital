const {
  challanRepository,
  challanItemRepository,
  saleRepository,
  saleItemRepository,
  productRepository,
  stockTransactionRepository
} = require('../repositories');
const CustomerService = require('./CustomerService');
const StockService = require('./StockService');

const STATUSES = ['Dispatched', 'Cancelled'];

class ChallanService {
  async list({ customerId, saleId, status } = {}) {
    let challans = await challanRepository.findAll(status ? { status } : {});
    if (customerId) challans = challans.filter((c) => c.customerId === customerId);
    if (saleId) challans = challans.filter((c) => c.saleId === saleId);
    challans.sort((a, b) => new Date(b.challanDate) - new Date(a.challanDate));
    return challans;
  }

  async getById(id) {
    const challan = await challanRepository.findById(id);
    if (!challan) {
      const err = new Error('Challan not found.');
      err.status = 404;
      throw err;
    }
    const items = await challanItemRepository.findByChallan(id);
    return { ...challan, items };
  }

  async create(input, { createdBy } = {}) {
    const { customerId, saleId = '', challanDate, note = '', items, deductStock } = input;

    await CustomerService.getById(customerId);

    let lineRecords = [];
    let shouldDeductStock = deductStock !== false;

    if (saleId) {
      const sale = await saleRepository.findById(saleId);
      if (!sale) {
        const err = new Error('Linked sale not found.');
        err.status = 422;
        throw err;
      }
      if (sale.customerId !== customerId) {
        const err = new Error('Customer does not match the linked sale.');
        err.status = 422;
        throw err;
      }
      if (sale.status === 'Cancelled') {
        const err = new Error('Cannot create challan for a cancelled sale.');
        err.status = 422;
        throw err;
      }

      const saleItems = await saleItemRepository.findBySale(saleId);
      const saleItemByProduct = Object.fromEntries(saleItems.map((i) => [i.productId, i]));

      if (!Array.isArray(items) || items.length === 0) {
        lineRecords = saleItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: parseFloat(i.quantity)
        }));
      } else {
        for (const line of items) {
          const sold = saleItemByProduct[line.productId];
          if (!sold) {
            const err = new Error(`Product ${line.productId} is not on the linked sale.`);
            err.status = 422;
            throw err;
          }
          const qty = parseFloat(line.quantity);
          if (!(qty > 0) || qty > parseFloat(sold.quantity)) {
            const err = new Error(`Invalid quantity for ${sold.productName}. Max: ${sold.quantity}.`);
            err.status = 422;
            throw err;
          }
          lineRecords.push({ productId: sold.productId, productName: sold.productName, quantity: qty });
        }
      }

      // Stock already deducted when the sale was recorded.
      shouldDeductStock = false;
    } else {
      if (!Array.isArray(items) || items.length === 0) {
        const err = new Error('At least one line item is required.');
        err.status = 422;
        throw err;
      }

      const stockByProduct = await stockTransactionRepository.computeCurrentStockForAll();

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
        if (shouldDeductStock && qty > available) {
          const err = new Error(`Insufficient stock for ${product.name}. Available: ${available}.`);
          err.status = 422;
          throw err;
        }
        lineRecords.push({ productId: product.id, productName: product.name, quantity: qty });
      }
    }

    const txnDate = challanDate || new Date().toISOString();

    const challan = await challanRepository.create({
      customerId,
      saleId: saleId || '',
      challanDate: txnDate,
      status: 'Dispatched',
      note,
      deductStock: shouldDeductStock ? 'Yes' : 'No',
      createdBy: createdBy || 'unknown'
    });

    for (const line of lineRecords) {
      await challanItemRepository.create({ challanId: challan.id, ...line });

      if (shouldDeductStock) {
        await StockService.recordTransaction({
          productId: line.productId,
          type: 'Sale',
          quantity: line.quantity,
          referenceType: 'Challan',
          referenceId: challan.id,
          note: `Challan ${challan.id}`,
          createdBy: createdBy || 'unknown',
          transactionDate: txnDate
        });
      }
    }

    return this.getById(challan.id);
  }

  async cancel(id, { createdBy } = {}) {
    const challan = await this.getById(id);
    if (challan.status === 'Cancelled') {
      const err = new Error('Challan is already cancelled.');
      err.status = 422;
      throw err;
    }

    if (challan.deductStock === 'Yes') {
      const txnDate = new Date().toISOString();
      for (const line of challan.items) {
        await StockService.recordTransaction({
          productId: line.productId,
          type: 'Sales Return',
          quantity: line.quantity,
          referenceType: 'Challan',
          referenceId: challan.id,
          note: `Challan ${challan.id} cancelled`,
          createdBy: createdBy || 'unknown',
          transactionDate: txnDate
        });
      }
    }

    await challanRepository.update(id, { status: 'Cancelled' });
    return this.getById(id);
  }
}

module.exports = new ChallanService();
module.exports.STATUSES = STATUSES;
