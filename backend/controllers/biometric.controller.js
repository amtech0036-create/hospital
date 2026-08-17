const BiometricEmployeeService = require('../services/BiometricEmployeeService');

class BiometricController {
  async list(req, res, next) {
    try {
      const data = await BiometricEmployeeService.list();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getByEmployeeId(req, res, next) {
    try {
      const data = await BiometricEmployeeService.getByEmployeeId(req.params.employeeId);
      res.json({ success: true, data: data || null });
    } catch (err) {
      next(err);
    }
  }

  async upsert(req, res, next) {
    try {
      const data = await BiometricEmployeeService.upsert(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await BiometricEmployeeService.remove(req.params.id);
      res.json({ success: true, message: 'Biometric profile removed.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BiometricController();
