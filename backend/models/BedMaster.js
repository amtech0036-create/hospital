const BedMaster = {
  name: 'BedMaster',
  collection: 'bed_masters',
  idPrefix: 'BED',
  columns: [
    'id',
    'tenantId',
    'bedNumber', // 'BED-101', 'CABIN-302'
    'wardType', // 'general', 'cabin', 'icu', 'emergency'
    'floor', // '1st Floor', '3rd Floor'
    'dailyCharge', // 1500
    'status', // 'available', 'occupied', 'reserved', 'cleaning', 'maintenance'
    'createdAt',
    'updatedAt'
  ]
};

module.exports = BedMaster;
