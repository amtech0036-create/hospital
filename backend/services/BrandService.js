const SimpleLookupService = require('./SimpleLookupService');
const { brandRepository } = require('../repositories');

module.exports = new SimpleLookupService(brandRepository, 'Brand');
