const { storeRequisitionRepository, productRepository } = require('../repositories');
const logger = require('../utils/logger');

class HospitalStoreService {
  /**
   * POST /api/store/requisitions
   * Create internal departmental stock transfer request.
   */
  async createRequisition({ fromDepartment, toDepartment = 'Central Store', items = [], requestedBy, notes }) {
    if (!fromDepartment || !items || items.length === 0) {
      const err = new Error('fromDepartment and at least one item are required for stock requisition.');
      err.status = 400;
      throw err;
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await storeRequisitionRepository.count({});
    const requisitionNumber = `REQ-${todayStr}-${String(count + 1).padStart(4, '0')}`;

    const requisition = await storeRequisitionRepository.create({
      requisitionNumber,
      fromDepartment,
      toDepartment,
      items,
      status: 'pending',
      requestedBy: requestedBy || 'Department Staff',
      approvedBy: null,
      notes: notes || ''
    });

    logger.info(`Store Requisition ${requisitionNumber} created for department ${fromDepartment}`);
    return requisition;
  }

  /**
   * PATCH /api/store/requisitions/:id/approve
   * Approve requisition & adjust stock levels.
   */
  async approveRequisition(requisitionId, { approvedBy = 'Store Manager' } = {}) {
    const reqDoc = await storeRequisitionRepository.findById(requisitionId);
    if (!reqDoc) {
      const err = new Error(`Requisition not found with ID ${requisitionId}`);
      err.status = 404;
      throw err;
    }

    const updated = await storeRequisitionRepository.update(requisitionId, {
      status: 'approved',
      approvedBy
    });

    logger.info(`Store Requisition ${reqDoc.requisitionNumber} approved by ${approvedBy}`);
    return updated;
  }

  async listRequisitions(query = {}) {
    return storeRequisitionRepository.findAll(query);
  }
}

module.exports = new HospitalStoreService();
