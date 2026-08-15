const ProductService = require('../services/ProductService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const list = asyncHandler(async (req, res) => {
  const { status, categoryId, brandId, search } = req.query;
  const products = await ProductService.list({ status, categoryId, brandId, search });
  return success(res, { message: 'Product list.', data: products });
});

const getOne = asyncHandler(async (req, res) => {
  const product = await ProductService.getById(req.params.id);
  return success(res, { message: 'Product detail.', data: product });
});

const create = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body);
  return success(res, { message: 'Product created.', data: product, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const product = await ProductService.update(req.params.id, req.body, {
    changedBy: req.user?.email,
    reason: req.body.priceChangeReason
  });
  return success(res, { message: 'Product updated.', data: product });
});

const remove = asyncHandler(async (req, res) => {
  await ProductService.remove(req.params.id);
  return success(res, { message: 'Product deactivated.' });
});

const removePermanent = asyncHandler(async (req, res) => {
  await ProductService.remove(req.params.id, { hard: true });
  return success(res, { message: 'Product permanently deleted.' });
});

const priceHistory = asyncHandler(async (req, res) => {
  const history = await ProductService.priceHistory(req.params.id);
  return success(res, { message: 'Product price history.', data: history });
});

const previewBulkMarkup = asyncHandler(async (req, res) => {
  const preview = await ProductService.previewBulkMarkup(req.body);
  return success(res, { message: 'Bulk markup preview.', data: preview });
});

const applyBulkMarkup = asyncHandler(async (req, res) => {
  const results = await ProductService.applyBulkMarkup({
    ...req.body,
    changedBy: req.user?.email
  });
  return success(res, { message: 'Bulk markup applied.', data: results });
});

const bulkImport = asyncHandler(async (req, res) => {
  const products = req.body.products || [];
  const result = await ProductService.bulkImport(products);
  return success(res, { message: `Bulk import completed. Successfully imported ${result.insertedCount} products.`, data: result });
});

module.exports = { list, getOne, create, update, remove, removePermanent, priceHistory, previewBulkMarkup, applyBulkMarkup, bulkImport };
