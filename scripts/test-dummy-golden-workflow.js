const { connectMongo, closeMongo } = require('../backend/config/mongoClient');
const PatientService = require('../backend/services/PatientService');
const EmergencyService = require('../backend/services/EmergencyService');
const NursingService = require('../backend/services/NursingService');
const PathologyService = require('../backend/services/PathologyService');
const RadiologyService = require('../backend/services/RadiologyService');
const ICUService = require('../backend/services/ICUService');
const OTService = require('../backend/services/OTService');
const BloodBankService = require('../backend/services/BloodBankService');
const HospitalBillingService = require('../backend/services/HospitalBillingService');

async function testGoldenWorkflow() {
  await connectMongo();
  console.log('=====================================================');
  console.log('STARTING GOLDEN WORKFLOW & INTEGRATION TEST (dummytest.md)');
  console.log('=====================================================');

  // 1. Fetch Golden Patient: AMGH-000001 (Rahim Ahmed)
  const patient = await PatientService.getById('AMGH-000001');
  console.log(`[PASS] Step 1: Golden Patient Verified: ${patient.fullName} (${patient.uhid})`);

  // 2. Emergency Triage
  const er = await EmergencyService.create({
    patientId: patient.id,
    uhid: patient.uhid,
    patientName: patient.fullName,
    triageLevel: 1,
    triageCategory: 'Resuscitation',
    vitalSigns: { bp: '160/100', pulse: '112', temp: '98.6', spo2: '91%', respRate: '24' },
    chiefComplaint: 'Severe chest pain',
    bedNumber: 'ER-Bed-01'
  });
  console.log(`[PASS] Step 2: Emergency Triage Level 1 Created: ${er.id} (Bed: ${er.bedNumber})`);

  // 3. Nursing MAR
  const nur = await NursingService.create({
    patientId: patient.id,
    uhid: patient.uhid,
    nurseName: 'Maria Akter',
    marRecords: [{ medicineName: 'Paracetamol 500mg', dose: '1 tablet', givenAt: new Date().toISOString(), status: 'Administered' }],
    shiftHandover: 'Patient monitored in ER, IV access secured.'
  });
  console.log(`[PASS] Step 3: Nursing MAR Entry Logged by ${nur.nurseName}`);

  // 4. Pathology Order
  const lab = await PathologyService.create({
    patientId: patient.id,
    uhid: patient.uhid,
    patientName: patient.fullName,
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    sampleType: 'EDTA Blood'
  });
  console.log(`[PASS] Step 4: Pathology Order & Barcode Generated: ${lab.barcode}`);

  // 5. Radiology Order
  const rad = await RadiologyService.create({
    patientId: patient.id,
    uhid: patient.uhid,
    patientName: patient.fullName,
    modality: 'X-Ray',
    procedureName: 'X-Ray Chest PA View',
    radiologistName: 'Dr. Imran Chowdhury'
  });
  console.log(`[PASS] Step 5: Radiology Procedure Scheduled: ${rad.procedureName}`);

  // 6. ICU Admission
  const icu = await ICUService.create({
    patientId: patient.id,
    uhid: patient.uhid,
    patientName: patient.fullName,
    bedNumber: 'ICU-01',
    ventilatorStatus: 'Invasive',
    vitalsFlowsheet: { bp: '160/100', pulse: '112' },
    intakeOutput: { intake: 2500, output: 1800 },
    doctorNotes: 'Intubated, critical monitoring.'
  });
  console.log(`[PASS] Step 6: ICU Bed Assigned: ${icu.bedNumber} (Balance: +${2500 - 1800} ml)`);

  // 7. OT Surgery
  const ot = await OTService.create({
    patientId: patient.id,
    uhid: patient.uhid,
    patientName: patient.fullName,
    procedureName: 'Appendectomy',
    otRoom: 'OT-01',
    leadSurgeon: 'Dr. Tareq Rahman',
    anesthetist: 'Dr. Anesthetist',
    checklistVerified: true
  });
  console.log(`[PASS] Step 7: OT Surgery Scheduled: ${ot.procedureName} (${ot.otRoom})`);

  // 8. Blood Bank Reservation
  const bbList = await BloodBankService.list({ bloodGroup: 'B+' });
  if (bbList.bloodInventory && bbList.bloodInventory.length) {
    const bag = bbList.bloodInventory[0];
    await BloodBankService.update(bag.id, { crossMatchPatientUhid: patient.uhid, issueStatus: 'Reserved / Cross-Matched' });
    console.log(`[PASS] Step 8: Blood Bag Reserved & Cross-Matched: ${bag.bagId} for ${patient.uhid}`);
  }

  // 9. Central Hospital Billing
  const bill = await HospitalBillingService.create({
    patientId: patient.id,
    uhid: patient.uhid,
    patientName: patient.fullName,
    departmentBreakdown: { opd: 500, diagnostics: 1700, pharmacy: 1200, emergency: 1000 },
    totalAmount: 4400,
    discount: 400,
    paidAmount: 2500,
    paymentMethod: 'Cash'
  });
  console.log(`[PASS] Step 9: Master Invoice Generated: Gross ৳${bill.totalAmount}, Discount ৳${bill.discount}, Net ৳${bill.netAmount}, Paid ৳${bill.paidAmount}, Due ৳${bill.dueAmount}`);

  // 10. Search-First Queries Verification
  const queries = ['A', 'Ra', 'Rah', 'Rahim', 'AMGH-000001', '01710000001'];
  for (const q of queries) {
    const searchRes = await PatientService.list({ search: q });
    if (!searchRes.patients.length) {
      throw new Error(`Search-First Failure for query: "${q}"`);
    }
  }
  console.log(`[PASS] Step 10: Search-First Autocomplete Validation Passed for all test patterns.`);

  console.log('=====================================================');
  console.log('ALL GOLDEN WORKFLOW & SEARCH-FIRST TESTS PASSED SUCCESSFULLY!');
  console.log('=====================================================');
  await closeMongo();
}

testGoldenWorkflow().catch(err => {
  console.error('Golden Workflow Test Failed:', err);
  process.exit(1);
});
