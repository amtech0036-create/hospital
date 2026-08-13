const SimpleLookupService = require('./SimpleLookupService');
const { categoryRepository } = require('../repositories');

module.exports = new SimpleLookupService(categoryRepository, 'Category');
