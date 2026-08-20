const DoctorSchedule = {
  name: 'DoctorSchedule',
  collection: 'doctor_schedules',
  idPrefix: 'DSCH',
  columns: [
    'id',
    'tenantId',
    'doctorId',
    'doctorName',
    'dayOfWeek', // 'Monday', 'Tuesday', ...
    'startTime', // '09:00'
    'endTime',   // '17:00'
    'slotDurationMinutes', // 15
    'maxTokens', // 30
    'consultationFee', // 1000
    'status', // 'Active', 'Inactive'
    'createdAt',
    'updatedAt'
  ]
};

module.exports = DoctorSchedule;
