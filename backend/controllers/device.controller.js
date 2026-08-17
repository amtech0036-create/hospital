const DeviceService = require('../services/DeviceService');

class DeviceController {
  async list(req, res, next) {
    try {
      const data = await DeviceService.list(req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await DeviceService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await DeviceService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await DeviceService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await DeviceService.remove(req.params.id);
      res.json({ success: true, message: 'Device removed successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async testConnectivity(req, res, next) {
    try {
      const result = await DeviceService.testConnectivity(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async syncLogs(req, res, next) {
    try {
      const result = await DeviceService.syncLogs(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async syncAllDevices(req, res, next) {
    try {
      const result = await DeviceService.syncAllDevices();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DeviceController();
