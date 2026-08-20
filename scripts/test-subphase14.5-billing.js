/**
 * Sub-Phase 14.5 Unified Hospital Billing & Patient Ledger Verification Script
 */

const UnifiedBillingService = require('../backend/services/UnifiedBillingService');
const IpdService = require('../backend/services/IpdService');
const PatientService = require('../backend/services/PatientService');
const DoctorService = require('../backend/services/DoctorService');
const { runWithTenant } = require('../backend/context/tenantContext');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');

async function testSubphase145() {
  console.log('====================================================');
  console.log(' SUB-PHASE 14.5: UNIFIED BILLING & LEDGER TEST      ');
  console.log('====================================================\n');

  await connectMongo();
  const tenant = { id: 'TNT-000001', subdomain: 'default', name: 'Default Enterprise Tenant' };

  await runWithTenant(tenant, async () => {
    // 1. Setup Patient, Doctor, Bed & Admission
    const patient = await PatientService.create({
      fullName: 'Unified Billing Patient',
      gender: 'Female',
      age: { value: 62, unit: 'Years' },
      phone: '01333221100'
    });

    const doctor = await DoctorService.create({
      name: 'Dr. Unified Consultant',
      phone: '01222110099'
    });

    const bed = await IpdService.createBed({
      bedNumber: 'CABIN-401',
      wardType: 'cabin',
      dailyCharge: 4000
    });

    const admission = await IpdService.admitPatient({
      patientId: patient.id,
      attendingDoctorId: doctor.id,
      bedId: bed.id,
      admissionDeposit: 5000 // 5000 BDT Advance Deposit
    });

    console.log(` -> SUCCESS: Setup Patient ${patient.fullName} (UHID: ${patient.uhid}), Admission #${admission.admissionNumber} with 5000 BDT Advance Deposit.`);

    // 2. Generate Consolidated Unified Final Invoice
    // Merge: Bed Charges (1 Day @ 4000) + Consultation (1000) + Diagnostics (2500) + Pharmacy (1200) + Nursing (800) - Deposit (5000) - Discount (500)
    const invoiceResult = await UnifiedBillingService.generateFinalInvoice({
      patientId: patient.id,
      admissionId: admission.id,
      consultationFees: 1000,
      diagnosticCharges: 2500,
      pharmacyCharges: 1200,
      nursingFees: 800,
      discountAmount: 500,
      paidAmount: 4000, // Partial or Full settlement
      paymentMethod: 'Card'
    });

    console.log(` -> SUCCESS: Generated Unified Final Hospital Invoice #${invoiceResult.invoiceNumber}`);
    console.log(` -> Financial Breakdown: Gross Total: ${invoiceResult.breakdown.totalGross} BDT, Deposit Offset: ${invoiceResult.financials.advanceDepositOffset} BDT, Discount: ${invoiceResult.financials.discountAmount} BDT, Net Payable: ${invoiceResult.financials.netAmount} BDT, Paid: ${invoiceResult.financials.paidAmount} BDT, Due: ${invoiceResult.financials.dueAmount} BDT.`);

    if (!invoiceResult.invoiceNumber.startsWith('FINAL-')) {
      throw new Error('Assertion Failed: Invalid Final Invoice Number prefix');
    }

    // 3. Verify Patient Running Ledger
    const ledgerData = await UnifiedBillingService.getPatientLedger(patient.uhid);
    console.log(` -> SUCCESS: Loaded Patient Running Ledger for UHID ${patient.uhid}. Total Billed: ${ledgerData.summary.totalBilled} BDT, Total Paid: ${ledgerData.summary.totalPaid} BDT, Net Running Balance: ${ledgerData.summary.currentBalance} BDT.`);
    console.log(` -> Ledger Transactions Count: ${ledgerData.ledger.length}`);

    if (ledgerData.ledger.length < 2) {
      throw new Error('Assertion Failed: Patient ledger entries missing!');
    }
  });

  console.log('\n====================================================');
  console.log(' SUB-PHASE 14.5 UNIFIED BILLING & LEDGER PASSED!   ');
  console.log('====================================================\n');
  await closeMongo();
}

if (require.main === module) {
  testSubphase145().catch((err) => {
    console.error('[SUB-PHASE 14.5 ERROR]', err);
    process.exit(1);
  });
}

module.exports = testSubphase145;
