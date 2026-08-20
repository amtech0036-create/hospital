const express = require('express');
const router = express.Router();

const env = require('../config/env');
const { getDb } = require('../config/mongoClient');

router.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbName = env.MONGODB_DB_NAME || 'Hospital_ERP_DB';
  try {
    const db = await getDb();
    if (db) dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  const memory = process.memoryUsage();
  return res.json({
    success: true,
    message: 'Hospital ERP API is healthy.',
    database: {
      name: dbName,
      status: dbStatus
    },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryHeapMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      memoryRssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100
    },
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/categories', require('./category.routes'));
router.use('/brands', require('./brand.routes'));
router.use('/units', require('./unit.routes'));
router.use('/products', require('./product.routes'));
router.use('/stock', require('./stock.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/suppliers', require('./supplier.routes'));
router.use('/sales', require('./sale.routes'));
router.use('/purchases', require('./purchase.routes'));
router.use('/challans', require('./challan.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/employees', require('./employee.routes'));
router.use('/departments', require('./department.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/leaves', require('./leave.routes'));
router.use('/advances', require('./advance.routes'));
router.use('/payroll', require('./payroll.routes'));
router.use('/devices', require('./device.routes'));
router.use('/shifts', require('./shift.routes'));
router.use('/biometrics', require('./biometric.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/reports', require('./report.routes'));
router.use('/diagnostics', require('./diagnostic.routes'));
router.use('/doctors', require('./doctor.routes'));
router.use('/patients', require('./patient.routes'));
router.use('/opd', require('./opd.routes'));
router.use('/emr', require('./emr.routes'));
router.use('/pharmacy', require('./pharmacy.routes'));
router.use('/ipd', require('./ipd.routes'));
router.use('/billing', require('./unifiedBilling.routes'));
router.use('/store', require('./hospitalStore.routes'));
router.use('/blood-bank', require('./bloodBank.routes'));
router.use('/super-admin', require('./superAdmin.routes'));

module.exports = router;
