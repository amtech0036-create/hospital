const MedicalRecord = {
  name: 'MedicalRecord',
  collection: 'medical_records',
  idPrefix: 'MED',
  columns: [
    'id',
    'tenantId',
    'patientId',
    'uhid',
    'recordType', // 'OPD', 'IPD', 'PRESCRIPTION', 'LIS_REPORT', 'RIS_REPORT', 'DOCUMENT'
    'title',
    'summary',
    'referenceId', // prescriptionId, resultId, etc.
    'doctorId',
    'doctorName',
    'recordedAt',
    'createdAt',
    'updatedAt'
  ]
};

module.exports = MedicalRecord;
