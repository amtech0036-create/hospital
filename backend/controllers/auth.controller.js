const AuthService = require('../services/AuthService');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login({ email, password });
  return success(res, { message: 'Login successful.', data: result });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await AuthService.register({ name, email, password, role });
  return success(res, { message: 'User registered successfully.', data: user, status: 201 });
});

const me = asyncHandler(async (req, res) => {
  return success(res, { message: 'Current user.', data: req.user });
});

module.exports = { login, register, me };
