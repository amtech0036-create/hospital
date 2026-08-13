const buildLookupController = require('./lookupControllerFactory');
const CategoryService = require('../services/CategoryService');

module.exports = buildLookupController(CategoryService, 'Category');
