const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { loginRules, registerRules } = require('../validators/auth.validator');

router.post('/login', loginRules, validate, authController.login);
router.post('/register', registerRules, validate, authController.register);
router.get('/me', authenticate, authController.me);

module.exports = router;
