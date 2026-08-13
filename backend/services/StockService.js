const { stockTransactionRepository, productRepository } = require('../repositories');

const VALID_TYPES = [
  'Opening Stock',
  'Purchase',
  'Sale',
  'Sales Return',
  'Purchase Return',
  'Stock Adjustment In',
  'Stock Adjustment Out',
  'Damaged',
  'Expired'
];

class StockService {
  async recordTransaction({ productId, type, quantity, referenceType, referenceId, note, createdBy, transactionDate }) {
    if (!VALID_TYPES.includes(type)) {
      const err = new Error(`type must be one of: ${VALID_TYPES.join(', ')}`);
      err.status = 422;
      throw err;
    }
    if (!(parseFloat(quantity) > 0)) {
      const err = new Error('quantity must be a positive number.');
      err.status = 422;
      throw err;
    }

    const product = await productRepository.findById(productId);
    if (!product) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    return stockTransactionRepository.create({
      productId,
      type,
      quantity,
      referenceType: referenceType || 'Manual',
      referenceId: referenceId || '',
      note: note || '',
      createdBy: createdBy || 'unknown',
      transactionDate: transactionDate || new Date().toISOString()
    });
  }

  async historyForProduct(productId) {
    const txns = await stockTransactionRepository.findByProduct(productId);
    return txns.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  }

  async currentStock(productId) {
    return stockTransactionRepository.computeCurrentStock(productId);
  }

  async lowStockProducts() {
    const [products, stockByProduct] = await Promise.all([
      productRepository.findAll({ status: 'Active' }),
      stockTransactionRepository.computeCurrentStockForAll()
    ]);

    return products
      .map((p) => ({
        ...p,
        currentStock: stockByProduct[p.id] || 0,
        minimumStock: parseFloat(p.minimumStock) || 0
      }))
      .filter((p) => p.currentStock <= p.minimumStock);
  }
}

module.exports = new StockService();
module.exports.VALID_TYPES = VALID_TYPES;
