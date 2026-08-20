/**
 * Sub-Phase 14.3 Hospital Pharmacy (Batch & Expiry FEFO) Verification Script
 */

const PharmacyService = require('../backend/services/PharmacyService');
const EmrService = require('../backend/services/EmrService');
const PatientService = require('../backend/services/PatientService');
const DoctorService = require('../backend/services/DoctorService');
const { productRepository, paymentRepository } = require('../backend/repositories');
const { runWithTenant } = require('../backend/context/tenantContext');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');

async function testSubphase143() {
  console.log('====================================================');
  console.log(' SUB-PHASE 14.3: PHARMACY BATCH & FEFO SALES TEST   ');
  console.log('====================================================\n');

  await connectMongo();
  const tenant = { id: 'TNT-000001', subdomain: 'default', name: 'Default Enterprise Tenant' };

  await runWithTenant(tenant, async () => {
    // 1. Setup Medicine Product with multiple FEFO batches
    const medicineProduct = await productRepository.create({
      sku: 'MED-NAPA-500',
      name: 'Napa Extra 500mg',
      isMedicine: true,
      genericName: 'Paracetamol',
      manufacturer: 'Beximco Pharma',
      dosageForm: 'Tablet',
      strength: '500mg',
      purchasePrice: 2,
      sellingPrice: 3.5,
      openingStock: 150,
      batches: [
        { batchNumber: 'BATCH-2026A', expiryDate: '2026-10-31', currentStock: 50, sellingPrice: 3.5 }, // Earliest expiry (FEFO Priority 1)
        { batchNumber: 'BATCH-2027B', expiryDate: '2027-05-31', currentStock: 100, sellingPrice: 3.5 }  // Later expiry (FEFO Priority 2)
      ],
      status: 'Active'
    });
    console.log(` -> SUCCESS: Setup Medicine Master ${medicineProduct.name} (SKU: ${medicineProduct.sku}) with 2 FEFO Batches (BATCH-2026A: 50, BATCH-2027B: 100).`);

    // 2. Setup Patient, Doctor & Prescription
    const patient = await PatientService.create({
      fullName: 'Pharmacy Test Patient',
      gender: 'Female',
      age: { value: 35, unit: 'Years' },
      phone: '01999887766'
    });

    const doctor = await DoctorService.create({
      name: 'Dr. Pharmacy Consultant',
      phone: '01666778899'
    });

    const prescription = await EmrService.createPrescription({
      patientId: patient.id,
      doctorId: doctor.id,
      doctorName: doctor.name,
      diagnosis: 'Fever and Bodily Pain',
      medicines: [
        { genericName: 'Paracetamol', brandName: 'Napa Extra 500mg', dosage: '500mg', frequency: '1-1-1', duration: '10 days' }
      ]
    });
    console.log(` -> SUCCESS: Generated Doctor Prescription #${prescription.prescriptionNumber}`);

    // 3. Auto-load Doctor Prescription Cart in Pharmacy
    const cart = await PharmacyService.getPrescriptionCart(prescription.prescriptionNumber);
    console.log(` -> SUCCESS: Auto-loaded Prescription cart for #${cart.prescriptionNumber}. Matched Product: ${cart.cartItems[0].productName} (Available Stock: ${cart.cartItems[0].availableStock})`);

    // 4. Process Pharmacy Sale of 70 Tablets (Should deduct 50 from BATCH-2026A and 20 from BATCH-2027B)
    const saleResult = await PharmacyService.processPharmacySale({
      patientId: patient.id,
      prescriptionId: prescription.id,
      items: [
        { productId: medicineProduct.id, quantity: 70, unitPrice: 3.5 }
      ],
      paymentMethod: 'Cash',
      discountAmount: 10,
      paidAmount: 235
    });

    console.log(` -> SUCCESS: Completed FEFO Pharmacy Sale #${saleResult.invoiceNumber}. Total Net Amount: ${saleResult.netAmount} BDT.`);

    const NapaAllocations = saleResult.items[0].batchAllocations;
    console.log(` -> FEFO Batch Allocation Summary:`, NapaAllocations);

    if (NapaAllocations.length !== 2 || NapaAllocations[0].batchNumber !== 'BATCH-2026A' || NapaAllocations[0].quantityDeducted !== 50) {
      throw new Error('Assertion Failed: FEFO batch allocation failed to prioritize earliest expiring batch!');
    }

    // 5. Verify Updated Product Stock
    const updatedProduct = await productRepository.findById(medicineProduct.id);
    console.log(` -> SUCCESS: Remaining Product Stock updated to: ${updatedProduct.openingStock}. Remaining in BATCH-2026A: ${updatedProduct.batches[0].currentStock}, BATCH-2027B: ${updatedProduct.batches[1].currentStock}`);

    // 6. Verify Accounts Revenue Entry
    const payment = await paymentRepository.findOne({ referenceId: saleResult.id });
    if (!payment) {
      throw new Error('Assertion Failed: Revenue payment not registered in Accounts module!');
    }
    console.log(` -> SUCCESS: Accounts Module registered Revenue Payment #${payment.id} of ${payment.amount} BDT.`);
  });

  console.log('\n====================================================');
  console.log(' SUB-PHASE 14.3 PHARMACY FEFO BATCH SALES PASSED!   ');
  console.log('====================================================\n');
  await closeMongo();
}

if (require.main === module) {
  testSubphase143().catch((err) => {
    console.error('[SUB-PHASE 14.3 ERROR]', err);
    process.exit(1);
  });
}

module.exports = testSubphase143;
