const BloodUnit = {
  name: 'BloodUnit',
  collection: 'blood_units',
  idPrefix: 'BLD',
  columns: [
    'id',
    'tenantId',
    'unitNumber', // 'BLD-20260820-0001'
    'bloodGroup', // 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
    'donorId',
    'donorName',
    'collectionDate',
    'expiryDate',
    'status', // 'available', 'reserved', 'transfused', 'discarded'
    'assignedPatientId',
    'assignedUhid',
    'notes',
    'createdAt',
    'updatedAt'
  ]
};

module.exports = BloodUnit;
