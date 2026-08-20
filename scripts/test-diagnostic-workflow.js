/**
 * End-to-End Diagnostic HIS/LIS/RIS Workflow Test Suite
 * Executable standalone node test verifying:
 * 1. Patient UHID registration
 * 2. Order billing & Code128 invoice barcode generation
 * 3. Scan lookup & specimen tube status pipeline transition
 * 4. Role-Based Access Control (RBAC) permission guards
 */

const assert = require('assert');
const DiagnosticService = require('../backend/services/DiagnosticService');
const { runWithTenant } = require('../backend/context/tenantContext');

async function runDiagnosticE2ETestSuite() {
  console.log('====================================================');
  console.log(' Starting HIS/LIS/RIS E2E Diagnostic Workflow Test  ');
  console.log('====================================================');

  const mockTenant = { id: 'TENANT-TEST-01', subdomain: 'test-hospital', name: 'Test Hospital' };

  await runWithTenant(mockTenant, async () => {
    // -----------------------------------------------------------
    // Step 1: Patient Registration & UHID Generation Test
    // -----------------------------------------------------------
    console.log('\n[TEST 1] Patient Registration & UHID Auto-Assignment...');
    const patientData = {
      fullName: 'E2E Test Patient',
      gender: 'Male',
      age: { value: 42, unit: 'Years' },
      bloodGroup: 'B+',
      phone: '+8801799887766',
      email: 'e2e.patient@example.com'
    };

    const patientRecord = await DiagnosticService.registerPatient(patientData);
    assert.ok(patientRecord.id, 'Patient ID must be defined.');
    assert.ok(patientRecord.uhid.startsWith('UHID-'), `UHID must start with prefix UHID-: ${patientRecord.uhid}`);
    console.log(` -> SUCCESS: Registered Patient ${patientRecord.fullName} with UHID: ${patientRecord.uhid}`);

    // -----------------------------------------------------------
    // Step 2: Diagnostic Order Creation & Barcode Generation
    // -----------------------------------------------------------
    console.log('\n[TEST 2] Diagnostic Order Billing & Barcode Generation...');
    const orderInput = {
      patient: patientRecord.id,
      patientId: patientRecord.id,
      tests: [
        { testId: 'LAB-CBC', testCode: 'LAB-CBC', testName: 'Complete Blood Count (CBC)', department: 'Pathology', price: 500 },
        { testId: 'RAD-MRI-BRAIN', testCode: 'RAD-MRI-BRAIN', testName: 'MRI Brain (Plain)', department: 'Radiology', price: 5500 }
      ],
      discountAmount: 200,
      paidAmount: 5800
    };

    const orderResult = await DiagnosticService.createOrder(orderInput, { createdBy: 'Receptionist' });
    const order = orderResult.order;

    assert.ok(order.invoiceNumber.startsWith('INV-'), 'Invoice Number must start with INV-');
    assert.ok(order.orderBarcode.startsWith('INV-TENANT-TEST-01-'), 'Order barcode must be Code128 format string');
    assert.strictEqual(order.tests.length, 2, 'Order must contain 2 test line items');
    assert.ok(order.tests[0].specimenBarcode.startsWith('SPEC-'), 'Specimen tube must have SPEC- barcode');
    assert.strictEqual(order.financials.netAmount, 5800, 'Net amount must equal 6000 - 200 = 5800');
    assert.strictEqual(order.financials.paymentStatus, 'Paid', 'Payment status must be Paid');
    console.log(` -> SUCCESS: Created Invoice ${order.invoiceNumber} with barcode: ${order.orderBarcode}`);

    // -----------------------------------------------------------
    // Step 3: Barcode Scan Lookup & Specimen Pipeline Transition
    // -----------------------------------------------------------
    console.log('\n[TEST 3] Barcode Scanning & Multi-Stage Pipeline Transition...');
    
    // A. Barcode Scan Lookup
    const scanResult = await DiagnosticService.scanBarcode(order.orderBarcode);
    assert.strictEqual(scanResult.order.invoiceNumber, order.invoiceNumber, 'Scan lookup must match invoice number');
    console.log(` -> SUCCESS: Scanned Barcode ${order.orderBarcode} matching patient ${scanResult.patient.fullName}`);

    // B. Phlebotomy Sample Collection
    const cbcSpecimenBarcode = order.tests[0].specimenBarcode;
    const sampleRes = await DiagnosticService.collectSample({
      orderId: order.id,
      specimenBarcode: cbcSpecimenBarcode,
      phlebotomistId: 'Phlebotomist-01'
    });
    assert.strictEqual(sampleRes.sampleStatus, 'sample_collected', 'Sample status must transition to sample_collected');
    console.log(` -> SUCCESS: Sample collected for tube ${cbcSpecimenBarcode}`);

    // C. Pathology LIS Result Save with Critical Value Evaluation
    const saveRes = await DiagnosticService.saveResults({
      orderId: order.id,
      specimenBarcode: cbcSpecimenBarcode,
      department: 'Pathology',
      pathologyResults: [
        { parameterName: 'Hemoglobin (Hb)', resultValue: '8.5', unit: 'g/dL', referenceRange: '12.0 - 16.0', isCritical: false }
      ],
      enteredBy: 'Lab_Technician-01'
    });
    assert.strictEqual(saveRes.status, 'result_ready', 'Result status must flip to result_ready');
    assert.strictEqual(saveRes.pathologyResults[0].isCritical, true, 'Abnormal low Hb (8.5 < 12.0) must trigger critical flag');
    console.log(' -> SUCCESS: Saved Pathology results with automated critical value flag evaluation');

    // D. Digital Signature Verification & Authorization
    const authRes = await DiagnosticService.authorizeResult({
      resultId: saveRes.id,
      authorizedBy: 'Dr. Pathologist MD',
      digitalSignature: { hash: 'SIG-HASH-VERIFIED-991' }
    });
    assert.strictEqual(authRes.status, 'authorized', 'Result status must flip to authorized');
    assert.strictEqual(authRes.digitalSignature.signedBy, 'Dr. Pathologist MD');
    console.log(` -> SUCCESS: Digitally authorized result by ${authRes.authorizedBy}`);

    // -----------------------------------------------------------
    // Step 4: Role-Based Access Control (RBAC) Validation
    // -----------------------------------------------------------
    console.log('\n[TEST 4] Role-Based Access Control (RBAC) Verification...');
    const authorizeMiddleware = require('../backend/middleware/role.middleware');

    // Receptionist role test on authorization endpoint
    const mockReqReceptionist = { user: { role: 'Receptionist' }, method: 'PATCH' };
    let forbiddenTriggered = false;
    const mockRes = {
      status(code) {
        if (code === 403) forbiddenTriggered = true;
        return this;
      },
      json() {}
    };

    const guard = authorizeMiddleware('Admin', 'Manager', 'Pathologist', 'Radiologist', 'Doctor');
    guard(mockReqReceptionist, mockRes, () => {});

    assert.ok(forbiddenTriggered, 'Receptionist role must be blocked (HTTP 403) from authorizing clinical results');
    console.log(' -> SUCCESS: RBAC Guard correctly blocked Receptionist from authorizing test results');

    console.log('\n====================================================');
    console.log(' ALL E2E DIAGNOSTIC WORKFLOW TESTS PASSED CLEANLY!  ');
    console.log('====================================================\n');
  });
}

if (require.main === module) {
  runDiagnosticE2ETestSuite().catch((err) => {
    console.error('E2E Diagnostic Workflow Test Failed:', err);
    process.exit(1);
  });
}

module.exports = runDiagnosticE2ETestSuite;
