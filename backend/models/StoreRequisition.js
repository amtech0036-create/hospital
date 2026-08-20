const StoreRequisition = {
  name: 'StoreRequisition',
  collection: 'store_requisitions',
  idPrefix: 'REQ',
  columns: [
    'id',
    'tenantId',
    'requisitionNumber', // 'REQ-20260820-0001'
    'fromDepartment', // 'Pharmacy', 'Lab', 'OT', 'Ward', 'Emergency'
    'toDepartment', // 'Central Store'
    'items', // array of { productId, productName, requestedQty, approvedQty }
    'status', // 'pending', 'approved', 'rejected', 'fulfilled'
    'requestedBy',
    'approvedBy',
    'notes',
    'createdAt',
    'updatedAt'
  ]
};

module.exports = StoreRequisition;
