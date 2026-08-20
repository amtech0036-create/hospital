/**
 * Sub-Phase 14.1 OPD, Doctor Scheduling & Token Queue Verification Script
 */

const OpdService = require('../backend/services/OpdService');
const DoctorService = require('../backend/services/DoctorService');
const PatientService = require('../backend/services/PatientService');
const { runWithTenant } = require('../backend/context/tenantContext');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');

async function testSubphase141() {
  console.log('====================================================');
  console.log(' SUB-PHASE 14.1: OPD, SCHEDULING & TOKEN QUEUE TEST ');
  console.log('====================================================\n');

  await connectMongo();
  const tenant = { id: 'TNT-000001', subdomain: 'default', name: 'Default Enterprise Tenant' };

  await runWithTenant(tenant, async () => {
    // 1. Create Doctor & Schedule
    const doctor = await DoctorService.create({
      name: 'Dr. OPD Consultant',
      specialization: 'General Medicine',
      department: 'OPD',
      phone: '01712000111',
      fee: 800
    });
    console.log(` -> SUCCESS: Doctor registered: ${doctor.name} (ID: ${doctor.id})`);

    const schedule = await OpdService.createSchedule({
      doctorId: doctor.id,
      doctorName: doctor.name,
      dayOfWeek: 'Thursday',
      startTime: '09:00',
      endTime: '13:00',
      slotDurationMinutes: 15,
      maxTokens: 20,
      consultationFee: 800
    });
    console.log(` -> SUCCESS: Doctor Schedule created: ${schedule.dayOfWeek} (${schedule.startTime} - ${schedule.endTime}, Max Tokens: ${schedule.maxTokens})`);

    // 2. Register Patient & Book OPD Appointment (Token #1)
    const patient1 = await PatientService.create({
      fullName: 'OPD Test Patient One',
      gender: 'Male',
      age: { value: 42, unit: 'Years' },
      phone: '01799111222'
    });

    const appointment1 = await OpdService.createAppointment({
      patientId: patient1.id,
      doctorId: doctor.id,
      notes: 'Routine checkup for fever'
    });
    console.log(` -> SUCCESS: Booked Appointment #${appointment1.appointmentNumber} with Token #${appointment1.tokenNumber} for ${appointment1.patientName}`);
    if (appointment1.tokenNumber !== 1) throw new Error('Assertion Failed: Token number should be 1');

    // 3. Book Second Appointment (Token #2)
    const patient2 = await PatientService.create({
      fullName: 'OPD Test Patient Two',
      gender: 'Female',
      age: { value: 29, unit: 'Years' },
      phone: '01899222333'
    });

    const appointment2 = await OpdService.createAppointment({
      patientId: patient2.id,
      doctorId: doctor.id,
      notes: 'Cough and cold'
    });
    console.log(` -> SUCCESS: Booked Appointment #${appointment2.appointmentNumber} with Token #${appointment2.tokenNumber} for ${appointment2.patientName}`);
    if (appointment2.tokenNumber !== 2) throw new Error('Assertion Failed: Token number should be 2');

    // 4. Nurse Triage Vitals Capture
    const vitalsData = { bp: '130/85', pulse: '78', temperature: '99.1', weight: '68', spo2: '98' };
    const updatedApt1 = await OpdService.updateVitals(appointment1.id, vitalsData);
    console.log(` -> SUCCESS: Nurse captured vitals for Token #${updatedApt1.tokenNumber}: BP ${updatedApt1.vitals.bp}, Pulse ${updatedApt1.vitals.pulse}. Status updated to: ${updatedApt1.status}`);

    // 5. Fetch Live Doctor Queue
    const queueData = await OpdService.getDoctorQueue(doctor.id);
    console.log(` -> SUCCESS: Fetched Live OPD Waiting Queue for Dr. ${doctor.name}: ${queueData.queue.length} patients waiting.`);
  });

  console.log('\n====================================================');
  console.log(' SUB-PHASE 14.1 OPD & TOKEN QUEUE TEST PASSED!     ');
  console.log('====================================================\n');
  await closeMongo();
}

if (require.main === module) {
  testSubphase141().catch((err) => {
    console.error('[SUB-PHASE 14.1 ERROR]', err);
    process.exit(1);
  });
}

module.exports = testSubphase141;
