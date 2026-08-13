const StockService = require('../services/StockService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const recordTransaction = asyncHandler(async (req, res) => {
  const txn = await StockService.recordTransaction({
    ...req.body,
    createdBy: req.user?.email
  });
  return success(res, { message: 'Stock transaction recorded.', data: txn, status: 201 });
});

const historyForProduct = asyncHandler(async (req, res) => {
  const history = await StockService.historyForProduct(req.params.productId);
  return success(res, { message: 'Stock history.', data: history });
});

const currentStock = asyncHandler(async (req, res) => {
  const stock = await StockService.currentStock(req.params.productId);
  return success(res, { message: 'Current stock.', data: { productId: req.params.productId, currentStock: stock } });
});

const lowStockProducts = asyncHandler(async (req, res) => {
  const products = await StockService.lowStockProducts();
  return success(res, { message: 'Low stock products.', data: products });
});

module.exports = { recordTransaction, historyForProduct, currentStock, lowStockProducts };
