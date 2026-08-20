/**
 * Sub-Phase 14.2 Electronic Prescription & EMR Timeline Verification Script
 */

const EmrService = require('../backend/services/EmrService');
const OpdService = require('../backend/services/OpdService');
const PatientService = require('../backend/services/PatientService');
const DoctorService = require('../backend/services/DoctorService');
const { runWithTenant } = require('../backend/context/tenantContext');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');

async function testSubphase142() {
  console.log('====================================================');
  console.log(' SUB-PHASE 14.2: ELECTRONIC PRESCRIPTION & EMR TEST  ');
  console.log('====================================================\n');

  await connectMongo();
  const tenant = { id: 'TNT-000001', subdomain: 'default', name: 'Default Enterprise Tenant' };

  await runWithTenant(tenant, async () => {
    // 1. Setup Patient & Doctor
    const patient = await PatientService.create({
      fullName: 'EMR Test Patient',
      gender: 'Male',
      age: { value: 50, unit: 'Years' },
      phone: '01711998877',
      bloodGroup: 'O+'
    });

    const doctor = await DoctorService.create({
      name: 'Dr. EMR Specialist',
      specialization: 'Internal Medicine',
      department: 'OPD',
      phone: '01811887766',
      fee: 1000
    });

    const appointment = await OpdService.createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      notes: 'High blood pressure & fever'
    });

    console.log(` -> SUCCESS: Setup Patient ${patient.fullName} (${patient.uhid}) & OPD Appointment #${appointment.appointmentNumber}`);

    // 2. Doctor Consultation Completion & Prescription Generation
    const prescriptionInput = {
      appointmentId: appointment.id,
      patientId: patient.id,
      doctorId: doctor.id,
      doctorName: doctor.name,
      diagnosis: 'Essential Hypertension & Upper Respiratory Tract Infection',
      symptoms: 'Headache, fever for 3 days',
      medicines: [
        { genericName: 'Paracetamol', brandName: 'Napa Extra', dosage: '500mg', frequency: '1-1-1', duration: '5 days', instructions: 'After meals' },
        { genericName: 'Amlodipine', brandName: 'Amdocal', dosage: '5mg', frequency: '0-0-1', duration: '30 days', instructions: 'At bedtime' }
      ],
      testsRecommended: ['LAB-CBC', 'RAD-XRAY-CHEST'],
      clinicalNotes: 'Monitor BP weekly. Rest for 3 days.',
      nextFollowUpDate: '2026-08-27'
    };

    const prescription = await EmrService.createPrescription(prescriptionInput);
    console.log(` -> SUCCESS: Generated Electronic Prescription #${prescription.prescriptionNumber} for ${prescription.patientName}`);
    if (!prescription.prescriptionNumber.startsWith('RX-')) {
      throw new Error('Assertion Failed: Invalid Prescription Number');
    }

    // 3. Centralized EMR Timeline Summary Query
    const emrTimeline = await EmrService.getEmrTimeline(patient.uhid);
    console.log(` -> SUCCESS: Fetched Centralized EMR Timeline for UHID ${patient.uhid}. Total indexed clinical records: ${emrTimeline.totalRecords}`);

    const rxRecord = emrTimeline.timeline.find((r) => r.recordType === 'PRESCRIPTION');
    if (!rxRecord) {
      throw new Error('Assertion Failed: Prescription record missing from EMR Timeline!');
    }
    console.log(` -> SUCCESS: EMR Timeline correctly indexed Prescription entry: "${rxRecord.title}" (${rxRecord.summary})`);
  });

  console.log('\n====================================================');
  console.log(' SUB-PHASE 14.2 PRESCRIPTION & EMR TIMELINE PASSED! ');
  console.log('====================================================\n');
  await closeMongo();
}

if (require.main === module) {
  testSubphase142().catch((err) => {
    console.error('[SUB-PHASE 14.2 ERROR]', err);
    process.exit(1);
  });
}

module.exports = testSubphase142;
