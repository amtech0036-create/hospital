const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

/**
 * Builds a standard set of CRUD handlers for a SimpleLookupService.
 * Category/Brand/Unit controllers are all one-liners around this.
 */
function buildLookupController(service, entityLabel) {
  return {
    list: asyncHandler(async (req, res) => {
      const items = await service.list({ status: req.query.status });
      return success(res, { message: `${entityLabel} list.`, data: items });
    }),

    getOne: asyncHandler(async (req, res) => {
      const item = await service.getById(req.params.id);
      return success(res, { message: `${entityLabel} detail.`, data: item });
    }),

    create: asyncHandler(async (req, res) => {
      const item = await service.create(req.body);
      return success(res, { message: `${entityLabel} created.`, data: item, status: 201 });
    }),

    update: asyncHandler(async (req, res) => {
      const item = await service.update(req.params.id, req.body);
      return success(res, { message: `${entityLabel} updated.`, data: item });
    }),

    remove: asyncHandler(async (req, res) => {
      await service.remove(req.params.id);
      return success(res, { message: `${entityLabel} deactivated.` });
    })
  };
}

module.exports = buildLookupController;
