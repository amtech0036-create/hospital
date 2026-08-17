const ShiftService = require('../services/ShiftService');

class ShiftController {
  async list(req, res, next) {
    try {
      const data = await ShiftService.list();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await ShiftService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await ShiftService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await ShiftService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await ShiftService.remove(req.params.id);
      res.json({ success: true, message: 'Shift removed successfully.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ShiftController();
