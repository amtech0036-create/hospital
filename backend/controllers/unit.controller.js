const buildLookupController = require('./lookupControllerFactory');
const UnitService = require('../services/UnitService');

module.exports = buildLookupController(UnitService, 'Unit');
