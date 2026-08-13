const express = require('express');
const router = express.Router();

const controller = require('../controllers/backup.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate, authorize('Admin'));

router.get('/status', controller.getStatus);
router.get('/download', controller.downloadBackup);
router.post('/drive-copy', controller.createDriveCopy);

module.exports = router;
