const logger = require('../utils/logger');
const { failure } = require('../utils/apiResponse');

function notFound(req, res) {
  return failure(res, { message: `Route not found: ${req.method} ${req.originalUrl}`, status: 404 });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.message || err);

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error.' : err.message;

  return failure(res, { message, status });
}

module.exports = { notFound, errorHandler };
