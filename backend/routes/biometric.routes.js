const express = require('express');
const router = express.Router();
const BiometricController = require('../controllers/biometric.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', (req, res, next) => BiometricController.list(req, res, next));
router.get('/employee/:employeeId', (req, res, next) => BiometricController.getByEmployeeId(req, res, next));
router.post('/', (req, res, next) => BiometricController.upsert(req, res, next));
router.delete('/:id', (req, res, next) => BiometricController.remove(req, res, next));

module.exports = router;
