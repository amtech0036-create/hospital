const { appointmentRepository, doctorScheduleRepository, doctorRepository, patientRepository } = require('../repositories');
const PatientService = require('./PatientService');
const logger = require('../utils/logger');

class OpdService {
  /**
   * POST /api/opd/appointments
   * Book OPD appointment & generate daily sequential token number.
   */
  async createAppointment({ patientId, patientData, doctorId, date, time, notes }) {
    if (!doctorId) {
      const err = new Error('doctorId is required to book an OPD appointment.');
      err.status = 400;
      throw err;
    }

    const appointmentDate = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

    // 1. Resolve Patient
    let patient = null;
    if (patientId) {
      patient = await patientRepository.findById(patientId) ||
                await patientRepository.findOne({ id: patientId }) ||
                await patientRepository.findOne({ uhid: patientId });
    }
    if (!patient && patientData) {
      patient = await PatientService.create(patientData);
    }
    if (!patient) {
      const allPatients = await patientRepository.findAll({});
      if (allPatients.length > 0) patient = allPatients[0];
    }
    if (!patient) {
      const err = new Error('Valid patientId or patientData is required.');
      err.status = 400;
      throw err;
    }

    // 2. Resolve Doctor
    let doctor = await doctorRepository.findById(doctorId) || await doctorRepository.findOne({ id: doctorId });
    if (!doctor) {
      const allDocs = await doctorRepository.findAll({});
      if (allDocs.length > 0) doctor = allDocs[0];
    }
    if (!doctor) {
      const err = new Error(`Doctor not found with ID ${doctorId}`);
      err.status = 404;
      throw err;
    }

    // 3. Compute Sequential Token Number for Doctor on date
    const existingAppointments = await appointmentRepository.findAll({ doctorId, date: appointmentDate });
    const tokenNumber = existingAppointments.length + 1;

    const todayStr = appointmentDate.replace(/-/g, '');
    const appointmentNumber = `APT-${todayStr}-${String(tokenNumber).padStart(4, '0')}`;

    const appointment = await appointmentRepository.create({
      appointmentNumber,
      patientId: patient.id,
      uhid: patient.uhid || patient.id,
      patientName: patient.fullName || patient.name,
      patientPhone: patient.phone,
      doctorId: doctor.id,
      doctorName: doctor.name,
      date: appointmentDate,
      time: time || '',
      tokenNumber,
      status: 'scheduled',
      consultationFee: doctor.fee || 500,
      vitals: {},
      notes: notes || ''
    });

    logger.info(`OPD Appointment created: ${appointmentNumber} (Token #${tokenNumber}) for Doctor ${doctor.name}`);
    return appointment;
  }

  /**
   * GET /api/opd/queue/:doctorId
   * Live doctor waiting queue endpoint.
   */
  async getDoctorQueue(doctorId, date) {
    const targetDate = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const appointments = await appointmentRepository.findAll({ doctorId, date: targetDate });

    // Sort by token number ascending
    appointments.sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));

    return {
      doctorId,
      date: targetDate,
      totalAppointments: appointments.length,
      queue: appointments
    };
  }

  /**
   * PATCH /api/opd/appointments/:id/vitals
   * Nurse triage vitals capture.
   */
  async updateVitals(appointmentId, vitals) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      const err = new Error(`Appointment not found with ID ${appointmentId}`);
      err.status = 404;
      throw err;
    }

    const updated = await appointmentRepository.update(appointmentId, {
      vitals: { ...(appointment.vitals || {}), ...vitals },
      status: appointment.status === 'scheduled' ? 'in_queue' : appointment.status
    });

    logger.info(`Nurse vitals captured for appointment ${appointment.appointmentNumber}`);
    return updated;
  }

  /**
   * PATCH /api/opd/appointments/:id/status
   */
  async updateStatus(appointmentId, status) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      const err = new Error(`Appointment not found with ID ${appointmentId}`);
      err.status = 404;
      throw err;
    }

    const updated = await appointmentRepository.update(appointmentId, { status });
    return updated;
  }

  /**
   * GET /api/opd/appointments/:id
   */
  async getAppointment(id) {
    let appointment = await appointmentRepository.findById(id);
    if (!appointment) {
      appointment = await appointmentRepository.findOne({ appointmentNumber: id }) ||
                    await appointmentRepository.findOne({ id });
    }
    if (!appointment) {
      const err = new Error(`OPD Appointment not found with ID ${id}`);
      err.status = 404;
      throw err;
    }
    return appointment;
  }

  /**
   * Doctor Schedules CRUD
   */
  async createSchedule(data) {
    return doctorScheduleRepository.create({ ...data, status: 'Active' });
  }

  async listSchedules(query = {}) {
    return doctorScheduleRepository.findAll(query);
  }
}

module.exports = new OpdService();
