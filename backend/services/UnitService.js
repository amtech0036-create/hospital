const SimpleLookupService = require('./SimpleLookupService');
const { unitRepository } = require('../repositories');

module.exports = new SimpleLookupService(unitRepository, 'Unit');
