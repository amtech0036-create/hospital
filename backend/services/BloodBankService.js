const { bloodUnitRepository } = require('../repositories');
const logger = require('../utils/logger');

class BloodBankService {
  /**
   * POST /api/blood-bank/units
   * Register new blood unit.
   */
  async registerBloodUnit({ bloodGroup, donorId, donorName, collectionDate, expiryDate, notes }) {
    if (!bloodGroup) {
      const err = new Error('bloodGroup is required for registering a blood unit.');
      err.status = 400;
      throw err;
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await bloodUnitRepository.count({});
    const unitNumber = `BLD-${todayStr}-${String(count + 1).padStart(4, '0')}`;

    const defaultExpiry = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 35 days standard shelf life

    const unit = await bloodUnitRepository.create({
      unitNumber,
      bloodGroup: bloodGroup.toUpperCase(),
      donorId: donorId || null,
      donorName: donorName || 'Anonymous Donor',
      collectionDate: collectionDate || new Date().toISOString().slice(0, 10),
      expiryDate: expiryDate || defaultExpiry,
      status: 'available',
      assignedPatientId: null,
      assignedUhid: null,
      notes: notes || ''
    });

    logger.info(`Blood Unit ${unitNumber} (${bloodGroup}) registered in Blood Bank.`);
    return unit;
  }

  /**
   * GET /api/blood-bank/inventory
   * Summary of blood stock grouped by blood group.
   */
  async getBloodInventory() {
    const allUnits = await bloodUnitRepository.findAll();
    const availableUnits = allUnits.filter((u) => u.status === 'available');

    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const summary = {};

    groups.forEach((g) => {
      summary[g] = availableUnits.filter((u) => u.bloodGroup === g).length;
    });

    return {
      totalAvailable: availableUnits.length,
      summary,
      allUnits
    };
  }

  /**
   * PATCH /api/blood-bank/units/:id/status
   * Update blood unit status (available, reserved, transfused, discarded).
   */
  async updateBloodUnitStatus(unitId, { status, assignedPatientId, assignedUhid }) {
    const unit = await bloodUnitRepository.findById(unitId);
    if (!unit) {
      const err = new Error(`Blood unit not found with ID ${unitId}`);
      err.status = 404;
      throw err;
    }

    const updated = await bloodUnitRepository.update(unitId, {
      status,
      assignedPatientId: assignedPatientId || unit.assignedPatientId,
      assignedUhid: assignedUhid || unit.assignedUhid
    });

    logger.info(`Blood Unit ${unit.unitNumber} status updated to ${status}`);
    return updated;
  }
}

module.exports = new BloodBankService();
