const {
  bedMasterRepository,
  admissionRepository,
  patientRepository,
  doctorRepository,
  paymentRepository,
  medicalRecordRepository
} = require('../repositories');
const PatientService = require('./PatientService');
const logger = require('../utils/logger');

class IpdService {
  /**
   * GET /api/ipd/beds/matrix
   * Real-time ward/bed matrix dashboard grouped by ward type.
   */
  async getBedMatrix() {
    const beds = await bedMasterRepository.findAll();

    const summary = {
      total: beds.length,
      available: beds.filter((b) => b.status === 'available').length,
      occupied: beds.filter((b) => b.status === 'occupied').length,
      cleaning: beds.filter((b) => b.status === 'cleaning').length,
      maintenance: beds.filter((b) => b.status === 'maintenance').length
    };

    const groupedByWard = {
      general: beds.filter((b) => (b.wardType || '').toLowerCase() === 'general'),
      cabin: beds.filter((b) => (b.wardType || '').toLowerCase() === 'cabin'),
      icu: beds.filter((b) => (b.wardType || '').toLowerCase() === 'icu'),
      emergency: beds.filter((b) => (b.wardType || '').toLowerCase() === 'emergency')
    };

    return { summary, groupedByWard, allBeds: beds };
  }

  /**
   * POST /api/ipd/admissions
   * Admit patient, lock bed state to 'occupied', and collect advance deposit.
   */
  async admitPatient({ patientId, patientData, attendingDoctorId, bedId, admissionDeposit = 0, dailyCareNotes }) {
    if (!bedId) {
      const err = new Error('bedId is required for IPD patient admission.');
      err.status = 400;
      throw err;
    }

    // 1. Resolve Bed & verify availability
    const bed = await bedMasterRepository.findById(bedId);
    if (!bed) {
      const err = new Error(`Bed not found with ID ${bedId}`);
      err.status = 404;
      throw err;
    }
    if (bed.status !== 'available') {
      const err = new Error(`Bed ${bed.bedNumber} is currently ${bed.status} and cannot be assigned.`);
      err.status = 400;
      throw err;
    }

    // 2. Resolve Patient
    let patient = null;
    if (patientId) {
      patient = await patientRepository.findById(patientId) || await patientRepository.findOne({ uhid: patientId });
    }
    if (!patient && patientData) {
      patient = await PatientService.create(patientData);
    }
    if (!patient) {
      const err = new Error('Valid patientId or patientData is required for admission.');
      err.status = 400;
      throw err;
    }

    // 3. Resolve Doctor
    let doctorName = 'Attending Physician';
    if (attendingDoctorId) {
      const doctor = await doctorRepository.findById(attendingDoctorId);
      if (doctor) doctorName = doctor.name;
    }

    // 4. Generate Admission Number
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await admissionRepository.count({});
    const admissionNumber = `ADM-${todayStr}-${String(count + 1).padStart(4, '0')}`;
    const admissionDate = new Date().toISOString();

    // 5. Create Admission Document
    const admission = await admissionRepository.create({
      admissionNumber,
      patientId: patient.id,
      uhid: patient.uhid || patient.id,
      patientName: patient.fullName || patient.name,
      patientPhone: patient.phone,
      attendingDoctorId: attendingDoctorId || null,
      attendingDoctorName: doctorName,
      bedId: bed.id,
      bedNumber: bed.bedNumber,
      wardType: bed.wardType,
      admissionDate,
      dischargeDate: null,
      admissionDeposit: Number(admissionDeposit) || 0,
      dailyCareNotes: dailyCareNotes || '',
      status: 'admitted'
    });

    // 6. Lock Bed State to 'occupied'
    await bedMasterRepository.update(bed.id, { status: 'occupied' });

    // 7. Register Advance Deposit Payment if provided
    if (Number(admissionDeposit) > 0) {
      await paymentRepository.create({
        partyType: 'CUSTOMER',
        partyId: patient.id,
        direction: 'INBOUND',
        amount: Number(admissionDeposit),
        paymentMethod: 'Cash',
        referenceType: 'IPD_DEPOSIT',
        referenceId: admission.id,
        note: `IPD Admission Advance Deposit for Admission #${admissionNumber}`
      });
    }

    // 8. Log EMR Timeline record
    await medicalRecordRepository.create({
      patientId: patient.id,
      uhid: patient.uhid || patient.id,
      recordType: 'IPD',
      title: `IPD Admission #${admissionNumber} (${bed.bedNumber} - ${bed.wardType.toUpperCase()})`,
      summary: `Admitted under Dr. ${doctorName}. Assigned Bed: ${bed.bedNumber}. Advance Deposit: ${admissionDeposit} BDT.`,
      referenceId: admission.id,
      doctorId: attendingDoctorId || null,
      doctorName,
      recordedAt: admissionDate
    });

    logger.info(`IPD Admission ${admissionNumber} created for UHID ${patient.uhid}. Bed ${bed.bedNumber} locked to occupied.`);
    return admission;
  }

  /**
   * POST /api/ipd/admissions/:id/discharge
   * Discharge patient, release bed state to 'cleaning', and calculate stay charges.
   */
  async dischargePatient(admissionId, { dischargeSummary = '' } = {}) {
    const admission = await admissionRepository.findById(admissionId);
    if (!admission) {
      const err = new Error(`Admission record not found with ID ${admissionId}`);
      err.status = 404;
      throw err;
    }
    if (admission.status === 'discharged') {
      const err = new Error(`Admission ${admission.admissionNumber} is already discharged.`);
      err.status = 400;
      throw err;
    }

    const dischargeDate = new Date().toISOString();

    // Calculate Days of Stay
    const startMs = new Date(admission.admissionDate).getTime();
    const endMs = new Date(dischargeDate).getTime();
    const diffHours = Math.max(1, (endMs - startMs) / (1000 * 60 * 60));
    const stayDays = Math.max(1, Math.ceil(diffHours / 24));

    // Get bed daily charge
    const bed = await bedMasterRepository.findById(admission.bedId);
    const dailyCharge = bed ? Number(bed.dailyCharge || 0) : 1000;
    const totalBedCharge = stayDays * dailyCharge;

    // Update Admission
    const updatedAdmission = await admissionRepository.update(admissionId, {
      status: 'discharged',
      dischargeDate,
      dischargeSummary: dischargeSummary || 'Patient discharged in stable condition.'
    });

    // Release Bed to 'cleaning'
    if (bed) {
      await bedMasterRepository.update(bed.id, { status: 'cleaning' });
    }

    // Log EMR Timeline record
    await medicalRecordRepository.create({
      patientId: admission.patientId,
      uhid: admission.uhid,
      recordType: 'IPD',
      title: `IPD Discharge #${admission.admissionNumber}`,
      summary: `Discharged after ${stayDays} days stay. Total Bed Charge: ${totalBedCharge} BDT. Summary: ${dischargeSummary || 'Stable'}`,
      referenceId: admission.id,
      doctorId: admission.attendingDoctorId,
      doctorName: admission.attendingDoctorName,
      recordedAt: dischargeDate
    });

    logger.info(`IPD Admission ${admission.admissionNumber} discharged. Bed ${admission.bedNumber} released to cleaning.`);

    return {
      admission: updatedAdmission,
      stayDays,
      dailyCharge,
      totalBedCharge,
      admissionDeposit: admission.admissionDeposit || 0
    };
  }

  /**
   * Bed Master CRUD
   */
  async createBed(data) {
    return bedMasterRepository.create({ ...data, status: data.status || 'available' });
  }

  async listBeds(query = {}) {
    return bedMasterRepository.findAll(query);
  }

  async updateBedStatus(bedId, status) {
    const bed = await bedMasterRepository.findById(bedId);
    if (!bed) {
      const err = new Error(`Bed not found with ID ${bedId}`);
      err.status = 404;
      throw err;
    }
    const updated = await bedMasterRepository.update(bedId, { status });
    logger.info(`Bed ${bed.bedNumber} status updated to ${status}`);
    return updated;
  }
}

module.exports = new IpdService();
