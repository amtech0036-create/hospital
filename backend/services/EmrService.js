const {
  prescriptionRepository,
  medicalRecordRepository,
  patientRepository,
  appointmentRepository,
  diagnosticResultRepository
} = require('../repositories');
const logger = require('../utils/logger');

class EmrService {
  /**
   * POST /api/prescriptions
   * Create Doctor Prescription & index in EMR Timeline.
   */
  async createPrescription({
    appointmentId,
    patientId,
    doctorId,
    doctorName,
    diagnosis,
    symptoms,
    medicines = [],
    testsRecommended = [],
    clinicalNotes,
    nextFollowUpDate
  }) {
    // 1. Resolve Patient
    let patient = null;
    if (patientId) {
      patient = await patientRepository.findById(patientId) ||
                await patientRepository.findOne({ id: patientId }) ||
                await patientRepository.findOne({ uhid: patientId });
    }
    if (!patient && appointmentId) {
      const apt = await appointmentRepository.findById(appointmentId) || await appointmentRepository.findOne({ id: appointmentId });
      if (apt) {
        patient = await patientRepository.findById(apt.patientId) || await patientRepository.findOne({ uhid: apt.uhid });
      }
    }
    if (!patient) {
      const allPatients = await patientRepository.findAll({});
      if (allPatients.length > 0) patient = allPatients[0];
    }

    if (!patient) {
      const err = new Error('Patient record not found to generate prescription.');
      err.status = 400;
      throw err;
    }

    // 2. Generate Prescription Number
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prescriptionRepository.count({});
    const prescriptionNumber = `RX-${todayStr}-${String(count + 1).padStart(4, '0')}`;

    const prescription = await prescriptionRepository.create({
      prescriptionNumber,
      patientId: patient.id,
      uhid: patient.uhid || patient.id,
      patientName: patient.fullName || patient.name,
      patientAge: typeof patient.age === 'object' ? `${patient.age.value} ${patient.age.unit}` : patient.age,
      patientGender: patient.gender,
      doctorId: doctorId || 'DOC-000001',
      doctorName: doctorName || 'Attending Physician',
      appointmentId: appointmentId || null,
      diagnosis: diagnosis || 'General Consultation',
      symptoms: symptoms || '',
      medicines,
      testsRecommended,
      clinicalNotes: clinicalNotes || '',
      nextFollowUpDate: nextFollowUpDate || null
    });

    // 3. Update appointment status if applicable
    if (appointmentId) {
      await appointmentRepository.update(appointmentId, { status: 'completed' });
    }

    // 4. Record entry in MedicalRecord timeline
    await medicalRecordRepository.create({
      patientId: patient.id,
      uhid: patient.uhid || patient.id,
      recordType: 'PRESCRIPTION',
      title: `Prescription #${prescriptionNumber} (${diagnosis || 'Consultation'})`,
      summary: `Diagnosed with: ${diagnosis || 'N/A'}. Prescribed ${medicines.length} medicines.`,
      referenceId: prescription.id,
      doctorId: doctorId || 'DOC-000001',
      doctorName: doctorName || 'Attending Physician',
      recordedAt: new Date().toISOString()
    });

    logger.info(`Electronic Prescription ${prescriptionNumber} created for UHID ${patient.uhid}`);
    return prescription;
  }

  /**
   * GET /api/patients/:uhid/emr-timeline
   * Centralized historical clinical summary.
   */
  async getEmrTimeline(uhid) {
    const patient = await patientRepository.findOne({ uhid }) || await patientRepository.findById(uhid);
    if (!patient) {
      const err = new Error(`Patient not found with UHID/ID: ${uhid}`);
      err.status = 404;
      throw err;
    }

    const patientUhid = patient.uhid || patient.id;

    // Fetch EMR timeline records
    const timeline = await medicalRecordRepository.findAll({ uhid: patientUhid });
    const prescriptions = await prescriptionRepository.findAll({ uhid: patientUhid });
    const diagnosticResults = await diagnosticResultRepository.findAll({ uhid: patientUhid });

    // Combine and sort chronologically descending
    const combinedEvents = [
      ...timeline.map((r) => ({ ...r, category: 'Medical Record' })),
      ...prescriptions.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        uhid: p.uhid,
        recordType: 'PRESCRIPTION',
        title: `Prescription #${p.prescriptionNumber}`,
        summary: `Diagnosis: ${p.diagnosis}. Medicines: ${p.medicines.length}, Tests: ${p.testsRecommended.length}`,
        referenceId: p.id,
        doctorId: p.doctorId,
        doctorName: p.doctorName,
        recordedAt: p.createdAt
      })),
      ...diagnosticResults.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        uhid: r.uhid,
        recordType: r.department === 'Radiology' ? 'RIS_REPORT' : 'LIS_REPORT',
        title: `${r.department} Result (${r.testName || 'Diagnostic'})`,
        summary: `Status: ${r.status}. Authorized by: ${r.authorizedBy || 'Pending'}`,
        referenceId: r.id,
        recordedAt: r.createdAt
      }))
    ];

    combinedEvents.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

    return {
      patient: {
        id: patient.id,
        uhid: patient.uhid,
        fullName: patient.fullName || patient.name,
        gender: patient.gender,
        age: patient.age,
        phone: patient.phone,
        bloodGroup: patient.bloodGroup
      },
      totalRecords: combinedEvents.length,
      timeline: combinedEvents
    };
  }

  async getPrescriptionByNumber(prescriptionNumber) {
    const rx = await prescriptionRepository.findOne({ prescriptionNumber }) || await prescriptionRepository.findById(prescriptionNumber);
    if (!rx) {
      const err = new Error(`Prescription not found with identifier: ${prescriptionNumber}`);
      err.status = 404;
      throw err;
    }
    return rx;
  }
}

module.exports = new EmrService();
