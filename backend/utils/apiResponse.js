function success(res, { message = 'OK', data = null, meta = null, status = 200 } = {}) {
  return res.status(status).json({ success: true, message, data, meta });
}

function failure(res, { message = 'Something went wrong', errors = null, status = 400 } = {}) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { success, failure };
