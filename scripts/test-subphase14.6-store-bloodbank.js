/**
 * Sub-Phase 14.6 Hospital Store Inventory & Blood Bank Verification Script
 */

const HospitalStoreService = require('../backend/services/HospitalStoreService');
const BloodBankService = require('../backend/services/BloodBankService');
const { bloodUnitRepository, storeRequisitionRepository } = require('../backend/repositories');
const { runWithTenant } = require('../backend/context/tenantContext');
const { connectMongo, closeMongo } = require('../backend/config/mongoClient');

async function testSubphase146() {
  console.log('====================================================');
  console.log(' SUB-PHASE 14.6: STORE INVENTORY & BLOOD BANK TEST  ');
  console.log('====================================================\n');

  await connectMongo();
  const tenant = { id: 'TNT-000001', subdomain: 'default', name: 'Default Enterprise Tenant' };

  await runWithTenant(tenant, async () => {
    // 1. Departmental Store Requisition Workflow
    const requisition = await HospitalStoreService.createRequisition({
      fromDepartment: 'OT',
      toDepartment: 'Central Store',
      requestedBy: 'OT Head Nurse',
      items: [
        { productName: 'Surgical Gloves Size 7.5', requestedQty: 100 },
        { productName: 'Sterile Gauze Bandage', requestedQty: 250 }
      ],
      notes: 'Urgent stock top-up for scheduled surgeries.'
    });

    console.log(` -> SUCCESS: Created Departmental Store Requisition #${requisition.requisitionNumber} for ${requisition.fromDepartment} department. Status: ${requisition.status}`);

    const approvedReq = await HospitalStoreService.approveRequisition(requisition.id, {
      approvedBy: 'Central Store Manager'
    });

    console.log(` -> SUCCESS: Approved Store Requisition #${approvedReq.requisitionNumber} by ${approvedReq.approvedBy}. Status updated to: ${approvedReq.status}`);

    // 2. Blood Bank Unit Registration
    const unit1 = await BloodBankService.registerBloodUnit({
      bloodGroup: 'O+',
      donorName: 'Voluntary Donor One',
      notes: 'Screened & Negative for HIV/Hepatitis'
    });

    const unit2 = await BloodBankService.registerBloodUnit({
      bloodGroup: 'AB-',
      donorName: 'Voluntary Donor Two'
    });

    console.log(` -> SUCCESS: Registered Blood Units ${unit1.unitNumber} (${unit1.bloodGroup}) and ${unit2.unitNumber} (${unit2.bloodGroup}).`);

    // 3. Fetch Real-time Blood Bank Inventory Summary
    const bloodInv = await BloodBankService.getBloodInventory();
    console.log(` -> SUCCESS: Fetched Live Blood Bank Inventory. Total Available Units: ${bloodInv.totalAvailable}, Stock Summary: O+ (${bloodInv.summary['O+']}), AB- (${bloodInv.summary['AB-']})`);

    // 4. Update Blood Unit Status (Reserved -> Transfused)
    const updatedUnit = await BloodBankService.updateBloodUnitStatus(unit1.id, {
      status: 'transfused',
      assignedUhid: 'UHID-TNT-000001-20260820-0001'
    });

    console.log(` -> SUCCESS: Updated Blood Unit ${updatedUnit.unitNumber} status to "${updatedUnit.status}" assigned to UHID ${updatedUnit.assignedUhid}.`);
  });

  console.log('\n====================================================');
  console.log(' SUB-PHASE 14.6 STORE & BLOOD BANK TEST PASSED!     ');
  console.log('====================================================\n');
  await closeMongo();
}

if (require.main === module) {
  testSubphase146().catch((err) => {
    console.error('[SUB-PHASE 14.6 ERROR]', err);
    process.exit(1);
  });
}

module.exports = testSubphase146;
