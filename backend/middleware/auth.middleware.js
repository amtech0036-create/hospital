const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { failure } = require('../utils/apiResponse');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return failure(res, { message: 'Authentication token missing.', status: 401 });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return failure(res, { message: 'Invalid or expired token.', status: 401 });
  }
}

module.exports = authenticate;
