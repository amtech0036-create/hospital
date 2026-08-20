const Appointment = {
  name: 'Appointment',
  collection: 'appointments',
  idPrefix: 'APT',
  columns: [
    'id',
    'tenantId',
    'appointmentNumber', // 'APT-20260820-0001'
    'patientId',
    'uhid',
    'patientName',
    'patientPhone',
    'doctorId',
    'doctorName',
    'date', // '2026-08-20'
    'tokenNumber', // 1, 2, 3...
    'status', // 'scheduled', 'in_queue', 'in_consultation', 'completed', 'cancelled'
    'consultationFee',
    'vitals', // { bp: '120/80', pulse: '72', temperature: '98.6', weight: '70', spo2: '98' }
    'notes',
    'createdAt',
    'updatedAt'
  ]
};

module.exports = Appointment;
