const express = require('express');
const router = express.Router();
const controller = require('../controllers/digitalServices.controller');

router.get('/telemedicine', controller.listTelemedicine);
router.post('/telemedicine', controller.createTelemedicine);

router.get('/executive-analytics', controller.getExecutiveAnalytics);

router.get('/audit-logs', controller.listAuditLogs);

router.post('/notifications/send', controller.sendNotification);

module.exports = router;
