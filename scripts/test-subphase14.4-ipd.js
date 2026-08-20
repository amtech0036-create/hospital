/**
 * Sub-Phase 14.4 Bed, Ward & IPD Admission Management Verification Script
 */

const IpdService = require('../backend/services/IpdService');
const PatientService = require('../backend/services/PatientService');
const DoctorService = require('../backend/services/DoctorService');
const { bedMasterRepository, paymentRepository } = require('../backend/repositories');
const { runWithTenant } = require('../backend/context/tenantContext');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');

async function testSubphase144() {
  console.log('====================================================');
  console.log(' SUB-PHASE 14.4: IPD ADMISSION & BED MATRIX TEST    ');
  console.log('====================================================\n');

  await connectMongo();
  const tenant = { id: 'TNT-000001', subdomain: 'default', name: 'Default Enterprise Tenant' };

  await runWithTenant(tenant, async () => {
    // 1. Create Beds across Ward Types
    const cabinBed = await IpdService.createBed({
      bedNumber: 'CABIN-305',
      wardType: 'cabin',
      floor: '3rd Floor',
      dailyCharge: 3500,
      status: 'available'
    });

    const icuBed = await IpdService.createBed({
      bedNumber: 'ICU-102',
      wardType: 'icu',
      floor: '1st Floor',
      dailyCharge: 8000,
      status: 'available'
    });

    console.log(` -> SUCCESS: Created Cabin Bed ${cabinBed.bedNumber} (3500 BDT/day) and ICU Bed ${icuBed.bedNumber} (8000 BDT/day).`);

    // 2. Fetch Bed Matrix Dashboard
    const matrix = await IpdService.getBedMatrix();
    console.log(` -> SUCCESS: Loaded Real-time Bed Matrix. Total Beds: ${matrix.summary.total}, Available: ${matrix.summary.available}, Cabin Beds Count: ${matrix.groupedByWard.cabin.length}`);

    // 3. Admit Patient to Cabin Bed & Collect Advance Deposit
    const patient = await PatientService.create({
      fullName: 'IPD Admitted Patient',
      gender: 'Male',
      age: { value: 58, unit: 'Years' },
      phone: '01555443322'
    });

    const doctor = await DoctorService.create({
      name: 'Dr. IPD Specialist',
      phone: '01444332211'
    });

    const admission = await IpdService.admitPatient({
      patientId: patient.id,
      attendingDoctorId: doctor.id,
      bedId: cabinBed.id,
      admissionDeposit: 10000,
      dailyCareNotes: 'Post-operative monitoring required.'
    });

    console.log(` -> SUCCESS: Admitted Patient ${patient.fullName} (UHID: ${patient.uhid}) under Admission #${admission.admissionNumber}. Assigned Bed: ${admission.bedNumber}`);

    // 4. Verify Bed State Locked to 'occupied'
    const lockedBed = await bedMasterRepository.findById(cabinBed.id);
    if (lockedBed.status !== 'occupied') {
      throw new Error('Assertion Failed: Bed status was not locked to occupied!');
    }
    console.log(` -> SUCCESS: Bed ${lockedBed.bedNumber} status verified locked to "occupied".`);

    // 5. Discharge Patient & Verify Bed State Released to 'cleaning'
    const dischargeResult = await IpdService.dischargePatient(admission.id, {
      dischargeSummary: 'Patient recovered steadily. Discharged with oral antibiotics.'
    });

    console.log(` -> SUCCESS: Discharged Admission #${dischargeResult.admission.admissionNumber}. Stay Duration: ${dischargeResult.stayDays} Day(s), Calculated Bed Charge: ${dischargeResult.totalBedCharge} BDT.`);

    const releasedBed = await bedMasterRepository.findById(cabinBed.id);
    if (releasedBed.status !== 'cleaning') {
      throw new Error('Assertion Failed: Bed status was not released to cleaning upon discharge!');
    }
    console.log(` -> SUCCESS: Bed ${releasedBed.bedNumber} status released to "cleaning".`);
  });

  console.log('\n====================================================');
  console.log(' SUB-PHASE 14.4 IPD ADMISSION & BED MATRIX PASSED!  ');
  console.log('====================================================\n');
  await closeMongo();
}

if (require.main === module) {
  testSubphase144().catch((err) => {
    console.error('[SUB-PHASE 14.4 ERROR]', err);
    process.exit(1);
  });
}

module.exports = testSubphase144;
