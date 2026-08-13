const buildLookupController = require('./lookupControllerFactory');
const BrandService = require('../services/BrandService');

module.exports = buildLookupController(BrandService, 'Brand');
