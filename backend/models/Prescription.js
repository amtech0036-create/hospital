const Prescription = {
  name: 'Prescription',
  collection: 'prescriptions',
  idPrefix: 'RX',
  columns: [
    'id',
    'tenantId',
    'prescriptionNumber', // 'RX-20260820-0001'
    'patientId',
    'uhid',
    'patientName',
    'patientAge',
    'patientGender',
    'doctorId',
    'doctorName',
    'appointmentId',
    'diagnosis',
    'symptoms',
    'medicines', // array of { genericName, brandName, dosage, frequency, duration, instructions }
    'testsRecommended', // array of test codes e.g. ['LAB-CBC', 'RAD-MRI-BRAIN']
    'clinicalNotes',
    'nextFollowUpDate',
    'createdAt',
    'updatedAt'
  ]
};

module.exports = Prescription;
