const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy.' }));

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
router.use('/payroll', require('./payroll.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;
