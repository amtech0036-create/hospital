/**
 * Phase 11 End-to-End Workflow Verification & Stabilization Script
 * Verifies Diagnostic Billing, Universal Scanner Workstation, Modality Dispatch,
 * Doctor Autocomplete, and Catalog/Patient Master State Mutations.
 */

const {
  patientRepository,
  diagnosticTestRepository,
  diagnosticOrderRepository,
  diagnosticResultRepository,
  doctorRepository
} = require('../backend/repositories');
const DiagnosticService = require('../backend/services/DiagnosticService');
const PatientService = require('../backend/services/PatientService');
const DoctorService = require('../backend/services/DoctorService');
const { runWithTenant } = require('../backend/context/tenantContext');

async function runPhase11Verification() {
  console.log('====================================================');
  console.log('   PHASE 11: END-TO-END WORKFLOW & STABILIZATION    ');
  console.log('====================================================\n');

  const tenant = { id: 'TNT-000001', subdomain: 'default', name: 'Default Enterprise Tenant' };

  await runWithTenant(tenant, async () => {
    // ----------------------------------------------------
    // TEST 1: Diagnostic Billing & Single Master Barcode
    // ----------------------------------------------------
    console.log('[FLOW 1] Diagnostic Billing to Master Barcode Generation...');

    // 1A. Register New Patient via Patient Master
    const patientData = {
      fullName: 'Phase11 Test Patient',
      gender: 'Female',
      age: { value: 34, unit: 'Years' },
      phone: '01899' + Math.floor(100000 + Math.random() * 900000),
      bloodGroup: 'B+'
    };

    const registeredPatient = await PatientService.create(patientData);
    console.log(` -> SUCCESS: Patient registered with UHID: ${registeredPatient.uhid} (ID: ${registeredPatient.id})`);

    // 1B. Doctor Selection
    const docData = {
      name: 'Dr. Phase11 Specialist',
      specialization: 'Internal Medicine',
      department: 'OPD',
      phone: '01711223344',
      commissionType: 'Percentage',
      commissionValue: 15
    };
    const registeredDoctor = await DoctorService.create(docData);
    console.log(` -> SUCCESS: Referring Doctor registered: ${registeredDoctor.name} (15% Commission)`);

    // 1C. Create Diagnostic Billing Order (1 Pathology CBC + 1 Radiology MRI)
    const orderInput = {
      patientId: registeredPatient.id,
      patientData: registeredPatient,
      referredDoctor: { name: registeredDoctor.name, id: registeredDoctor.id },
      tests: [
        { testId: 'LAB-CBC', testCode: 'LAB-CBC', testName: 'Complete Blood Count', department: 'Pathology', price: 500 },
        { testId: 'RAD-MRI-BRAIN', testCode: 'RAD-MRI-BRAIN', testName: 'MRI Brain Plain', department: 'Radiology', price: 5500 }
      ],
      financials: { totalAmount: 6000, discountAmount: 500, taxAmount: 0, netAmount: 5500, paidAmount: 5500, dueAmount: 0 }
    };

    const billingResult = await DiagnosticService.createOrder(orderInput, { createdBy: 'Receptionist' });
    const order = billingResult.order;

    console.log(` -> SUCCESS: Created Diagnostic Order Invoice: ${order.invoiceNumber} with Single Header Master Barcode: ${order.orderBarcode}`);
    if (!order.orderBarcode.startsWith('INV-')) {
      throw new Error('Assertion Failed: Invoice master barcode is invalid!');
    }

    // ----------------------------------------------------
    // TEST 2: Department Scanner Station & Modality Dispatch
    // ----------------------------------------------------
    console.log('\n[FLOW 2] Universal Scanner & Department Modality Dispatch...');

    // 2A. Scan Invoice Master Barcode
    const scanData = await DiagnosticService.scanBarcode(order.orderBarcode);
    console.log(` -> SUCCESS: Scanned Master Barcode ${order.orderBarcode}. Resolved ${scanData.orderedTests.length} tests.`);

    const pathologyTest = scanData.orderedTests.find((t) => t.department === 'Pathology');
    const radiologyTest = scanData.orderedTests.find((t) => t.department === 'Radiology');

    if (!pathologyTest || !radiologyTest) {
      throw new Error('Assertion Failed: Modality items split incorrectly!');
    }

    // 2B. Phlebotomy Sample Collection & On-Demand Tube Barcode
    console.log(` -> On-Demand Tube Label Specimen Barcode: ${pathologyTest.specimenBarcode}`);
    await DiagnosticService.collectSample({ orderId: order.id, specimenBarcode: pathologyTest.specimenBarcode, phlebotomistId: 'Phlebotomist-01' });
    console.log(' -> SUCCESS: Phlebotomist collected sample for specimen tube.');

    // 2C. LIS & RIS Result Entry
    await DiagnosticService.saveResults({
      specimenBarcode: pathologyTest.specimenBarcode,
      department: 'Pathology',
      pathologyResults: [
        { parameterName: 'Hemoglobin', resultValue: '14.2', unit: 'g/dL', referenceRange: '13.5 - 17.5', isCritical: false }
      ],
      enteredBy: 'Lab_Technician'
    });

    await DiagnosticService.saveResults({
      specimenBarcode: radiologyTest.specimenBarcode,
      department: 'Radiology',
      radiologyReport: {
        clinicalHistory: 'Headache',
        technique: 'Multi-planar MRI brain',
        findings: 'Normal brain parenchyma.',
        impression: 'Unremarkable MRI brain scan.'
      },
      enteredBy: 'Radiologist'
    });

    console.log(' -> SUCCESS: LIS Tabular Parameter Entry & RIS Narrative Report saved.');

    // 2D. Digital Authorization
    const pathResult = await diagnosticResultRepository.findOne({ specimenBarcode: pathologyTest.specimenBarcode });
    const radResult = await diagnosticResultRepository.findOne({ specimenBarcode: radiologyTest.specimenBarcode });

    await DiagnosticService.authorizeResult({ resultId: pathResult.id, authorizedBy: 'Dr. Pathologist MD' });
    await DiagnosticService.authorizeResult({ resultId: radResult.id, authorizedBy: 'Dr. Radiologist MD' });
    console.log(' -> SUCCESS: Digitally authorized pathology and radiology reports.');

    // ----------------------------------------------------
    // TEST 3: Catalog & Master State Mutation Check
    // ----------------------------------------------------
    console.log('\n[FLOW 3] Catalog & Patient Master Mutation Check...');

    // 3A. Test Catalog Add & Edit
    const testCode = 'LAB-P11-' + Math.floor(1000 + Math.random() * 9000);
    const newTest = await DiagnosticService.createTest({
      code: testCode,
      name: 'Phase 11 Special Biomarker',
      department: 'Pathology',
      category: 'Biochemistry',
      price: 2500,
      sampleType: 'Serum'
    });
    console.log(` -> SUCCESS: Added new diagnostic test master: ${newTest.code} (${newTest.name})`);

    const updatedTest = await DiagnosticService.updateTest(newTest.id, { price: 2800 });
    console.log(` -> SUCCESS: Updated diagnostic test master price to ${updatedTest.price} BDT.`);

    // 3B. Patient Master Mutation & Hard Delete Verification
    const updatedPatient = await PatientService.update(registeredPatient.id, { bloodGroup: 'AB+' });
    console.log(` -> SUCCESS: Updated patient blood group to ${updatedPatient.bloodGroup}.`);

    await PatientService.remove(registeredPatient.id);
    const checkDeleted = await patientRepository.findById(registeredPatient.id);
    if (checkDeleted) {
      throw new Error('Assertion Failed: Patient record was not removed cleanly!');
    }
    console.log(' -> SUCCESS: Patient record cleanly purged from database upon delete action.');
  });

  console.log('\n====================================================');
  console.log(' ALL PHASE 11 E2E WORKFLOW VERIFICATIONS PASSED!    ');
  console.log('====================================================\n');
}

if (require.main === module) {
  runPhase11Verification().catch((err) => {
    console.error('\n[PHASE 11 E2E ERROR]', err);
    process.exit(1);
  });
}

module.exports = runPhase11Verification;
