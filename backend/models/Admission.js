const Admission = {
  name: 'Admission',
  collection: 'admissions',
  idPrefix: 'ADM',
  columns: [
    'id',
    'tenantId',
    'admissionNumber', // 'ADM-20260820-0001'
    'patientId',
    'uhid',
    'patientName',
    'patientPhone',
    'attendingDoctorId',
    'attendingDoctorName',
    'bedId',
    'bedNumber',
    'wardType',
    'admissionDate',
    'dischargeDate',
    'admissionDeposit',
    'dailyCareNotes',
    'status', // 'admitted', 'transferred', 'discharged'
    'dischargeSummary',
    'createdAt',
    'updatedAt'
  ]
};

module.exports = Admission;
