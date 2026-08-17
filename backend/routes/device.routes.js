const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/device.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', (req, res, next) => DeviceController.list(req, res, next));
router.post('/sync-all', (req, res, next) => DeviceController.syncAllDevices(req, res, next));
router.get('/:id', (req, res, next) => DeviceController.getById(req, res, next));
router.post('/', (req, res, next) => DeviceController.create(req, res, next));
router.put('/:id', (req, res, next) => DeviceController.update(req, res, next));
router.delete('/:id', (req, res, next) => DeviceController.remove(req, res, next));
router.post('/:id/test-connection', (req, res, next) => DeviceController.testConnectivity(req, res, next));
router.post('/:id/sync-logs', (req, res, next) => DeviceController.syncLogs(req, res, next));

module.exports = router;
