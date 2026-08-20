/**
 * Diagnostic Test Master Catalog Seeder Script
 * Pre-populates standard Pathology tests & Radiology narrative templates
 * for fresh tenant deployments.
 */

const { diagnosticTestRepository } = require('../backend/repositories');
const { runWithTenant } = require('../backend/context/tenantContext');
const logger = require('../backend/utils/logger');

const SEED_TESTS = [
  {
    code: 'LAB-CBC',
    name: 'Complete Blood Count (CBC)',
    department: 'Pathology',
    category: 'Hematology',
    price: 500,
    sampleType: 'EDTA Blood',
    specimenContainer: 'Purple Top Tube',
    parameters: [
      { parameterName: 'Hemoglobin (Hb)', unit: 'g/dL', referenceRanges: [{ gender: 'Male', minAge: 12, maxAge: 120, rangeLow: 13.5, rangeHigh: 17.5 }] },
      { parameterName: 'Total WBC Count', unit: '/cu.mm', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 4000, rangeHigh: 11000 }] },
      { parameterName: 'Platelet Count', unit: '/cu.mm', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 150000, rangeHigh: 450000 }] },
      { parameterName: 'ESR (Erythrocyte Sedimentation Rate)', unit: 'mm/1st hr', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 0, rangeHigh: 20 }] }
    ],
    status: 'Active'
  },
  {
    code: 'LAB-LIPID',
    name: 'Lipid Profile Panel',
    department: 'Pathology',
    category: 'Biochemistry',
    price: 1200,
    sampleType: 'Serum',
    specimenContainer: 'Red Top Tube',
    parameters: [
      { parameterName: 'Total Cholesterol', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 120, rangeHigh: 200 }] },
      { parameterName: 'Triglycerides', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 50, rangeHigh: 150 }] },
      { parameterName: 'HDL Cholesterol', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 40, rangeHigh: 60 }] },
      { parameterName: 'LDL Cholesterol', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 0, rangeHigh: 100 }] }
    ],
    status: 'Active'
  },
  {
    code: 'LAB-LFT',
    name: 'Liver Function Test (LFT)',
    department: 'Pathology',
    category: 'Biochemistry',
    price: 1200,
    sampleType: 'Serum',
    specimenContainer: 'Red Top Tube',
    parameters: [
      { parameterName: 'Bilirubin Total', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 0.2, rangeHigh: 1.2 }] },
      { parameterName: 'SGPT / ALT', unit: 'U/L', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 7, rangeHigh: 56 }] },
      { parameterName: 'SGOT / AST', unit: 'U/L', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 10, rangeHigh: 40 }] },
      { parameterName: 'Alkaline Phosphatase (ALP)', unit: 'U/L', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 44, rangeHigh: 147 }] }
    ],
    status: 'Active'
  },
  {
    code: 'LAB-KFT',
    name: 'Kidney Function Test (KFT)',
    department: 'Pathology',
    category: 'Biochemistry',
    price: 1000,
    sampleType: 'Serum',
    specimenContainer: 'Red Top Tube',
    parameters: [
      { parameterName: 'Serum Creatinine', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 0.6, rangeHigh: 1.3 }] },
      { parameterName: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 7, rangeHigh: 20 }] },
      { parameterName: 'Uric Acid', unit: 'mg/dL', referenceRanges: [{ gender: 'All', minAge: 0, maxAge: 120, rangeLow: 3.5, rangeHigh: 7.2 }] }
    ],
    status: 'Active'
  },
  {
    code: 'RAD-MRI-BRAIN',
    name: 'MRI Brain (Plain)',
    department: 'Radiology',
    category: 'MRI',
    price: 5500,
    radiologyDetails: {
      modality: 'MRI',
      bodyPart: 'Brain / Head',
      instructions: 'Patient must remove all ferromagnetic objects prior to entering scanner room.'
    },
    status: 'Active'
  },
  {
    code: 'RAD-CT-CHEST',
    name: 'CT Scan Chest (Plain)',
    department: 'Radiology',
    category: 'CT Scan',
    price: 4500,
    radiologyDetails: {
      modality: 'CT',
      bodyPart: 'Chest / Thorax',
      instructions: 'Single breath-hold CT scan of chest.'
    },
    status: 'Active'
  },
  {
    code: 'RAD-XRAY-CHEST',
    name: 'X-Ray Chest PA View',
    department: 'Radiology',
    category: 'X-Ray',
    price: 500,
    radiologyDetails: {
      modality: 'X-Ray',
      bodyPart: 'Chest',
      instructions: 'Standard PA erect view.'
    },
    status: 'Active'
  }
];

async function seedDiagnosticCatalog(tenantId = 'TNT-000001') {
  console.log(`[SEED] Seeding standard diagnostic tests for tenant: ${tenantId}...`);
  const mockTenant = { id: tenantId, subdomain: 'default', name: 'Default Tenant' };

  await runWithTenant(mockTenant, async () => {
    let seededCount = 0;

    for (const testItem of SEED_TESTS) {
      const existing = await diagnosticTestRepository.findOne({ code: testItem.code });
      if (!existing) {
        await diagnosticTestRepository.create({
          ...testItem,
          tenantId
        });
        seededCount++;
      }
    }

    console.log(`[SEED SUCCESS] Successfully seeded ${seededCount} standard diagnostic test master records.`);
  });
}

if (require.main === module) {
  seedDiagnosticCatalog().catch((err) => {
    console.error('[SEED ERROR] Failed to seed diagnostic catalog:', err);
    process.exit(1);
  });
}

module.exports = seedDiagnosticCatalog;
