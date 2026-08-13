const express = require('express');
const router = express.Router();

const controller = require('../controllers/report.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', controller.getReport);

module.exports = router;
