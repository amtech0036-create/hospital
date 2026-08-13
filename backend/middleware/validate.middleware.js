const { validationResult } = require('express-validator');
const { failure } = require('../utils/apiResponse');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return failure(res, {
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      status: 422
    });
  }
  next();
}

module.exports = validate;
