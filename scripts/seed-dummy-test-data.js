const { connectMongo, closeMongo } = require('../backend/config/mongoClient');
const {
  patientRepository,
  doctorRepository,
  employeeRepository,
  pharmacyRepository,
  bloodBankRepo,
  emergencyRepository,
  nursingRepository,
  pathologyRepository,
  radiologyRepository,
  icuRepository,
  otRepository,
  hospitalBillingRepository
} = require('../backend/repositories');

async function seedDummyData() {
  await connectMongo();
  console.log('--- SEEDING DUMMY TEST DATA FROM dummytest.md ---');

  // 1. Seed Patients (AMGH-000001 to AMGH-000010)
  const patientsData = [
    { uhid: 'AMGH-000001', fullName: 'Rahim Ahmed', gender: 'Male', age: 45, phone: '01710000001', bloodGroup: 'B+' },
    { uhid: 'AMGH-000002', fullName: 'Karim Hasan', gender: 'Male', age: 32, phone: '01710000002', bloodGroup: 'O+' },
    { uhid: 'AMGH-000003', fullName: 'Nusrat Jahan', gender: 'Female', age: 28, phone: '01710000003', bloodGroup: 'A+' },
    { uhid: 'AMGH-000004', fullName: 'Fatema Akter', gender: 'Female', age: 62, phone: '01710000004', bloodGroup: 'B+' },
    { uhid: 'AMGH-000005', fullName: 'Arif Hossain', gender: 'Male', age: 19, phone: '01710000005', bloodGroup: 'O-' },
    { uhid: 'AMGH-000006', fullName: 'Sumaiya Rahman', gender: 'Female', age: 35, phone: '01710000006', bloodGroup: 'AB+' },
    { uhid: 'AMGH-000007', fullName: 'Sakib Khan', gender: 'Male', age: 8, phone: '01710000007', bloodGroup: 'A+' },
    { uhid: 'AMGH-000008', fullName: 'Rina Begum', gender: 'Female', age: 54, phone: '01710000008', bloodGroup: 'O+' },
    { uhid: 'AMGH-000009', fullName: 'Tanvir Islam', gender: 'Male', age: 67, phone: '01710000009', bloodGroup: 'B-' },
    { uhid: 'AMGH-000010', fullName: 'Jannatul Ferdous', gender: 'Female', age: 24, phone: '01710000010', bloodGroup: 'AB+' }
  ];

  for (const p of patientsData) {
    const existing = await patientRepository.findOne({ uhid: p.uhid });
    if (!existing) {
      await patientRepository.create({
        tenantId: 'TNT-000001',
        uhid: p.uhid,
        fullName: p.fullName,
        gender: p.gender,
        age: p.age,
        phone: p.phone,
        bloodGroup: p.bloodGroup,
        status: 'Active'
      });
      console.log(`[+] Seeded Patient: ${p.uhid} - ${p.fullName}`);
    }
  }

  // 2. Seed Doctors
  const doctorsData = [
    { fullName: 'Dr. Hasan Mahmud', department: 'Emergency', specialty: 'Emergency Medicine' },
    { fullName: 'Dr. Farzana Ahmed', department: 'OPD', specialty: 'Internal Medicine' },
    { fullName: 'Dr. Saiful Islam', department: 'Cardiology', specialty: 'Cardiology' },
    { fullName: 'Dr. Nusrat Karim', department: 'Obs/Gynae', specialty: 'Gynecology' },
    { fullName: 'Dr. Rakib Hasan', department: 'Pediatrics', specialty: 'Pediatrics' },
    { fullName: 'Dr. Imran Chowdhury', department: 'Radiology', specialty: 'Radiologist' },
    { fullName: 'Dr. Tareq Rahman', department: 'Surgery', specialty: 'General Surgery' }
  ];

  for (const d of doctorsData) {
    const existing = await doctorRepository.findOne({ fullName: d.fullName });
    if (!existing) {
      await doctorRepository.create({
        tenantId: 'TNT-000001',
        fullName: d.fullName,
        department: d.department,
        specialty: d.specialty,
        status: 'Active'
      });
      console.log(`[+] Seeded Doctor: ${d.fullName} (${d.department})`);
    }
  }

  // 3. Seed Pharmacy Medicines
  const medicinesData = [
    { brandName: 'Paracetamol 500mg', batchNumber: 'PCM001', quantityInStock: 500, expiryDate: '2027-12-31' },
    { brandName: 'Amoxicillin 500mg', batchNumber: 'AMX001', quantityInStock: 200, expiryDate: '2027-06-30' },
    { brandName: 'Omeprazole 20mg', batchNumber: 'OMP001', quantityInStock: 300, expiryDate: '2028-01-31' },
    { brandName: 'Salbutamol', batchNumber: 'SAL001', quantityInStock: 100, expiryDate: '2027-09-30' },
    { brandName: 'Ceftriaxone 1g', batchNumber: 'CEF001', quantityInStock: 50, expiryDate: '2027-03-31' }
  ];

  for (const m of medicinesData) {
    const existing = await pharmacyRepository.findOne({ batchNumber: m.batchNumber });
    if (!existing) {
      await pharmacyRepository.create({
        tenantId: 'TNT-000001',
        brandName: m.brandName,
        genericName: m.brandName,
        batchNumber: m.batchNumber,
        quantityInStock: m.quantityInStock,
        expiryDate: m.expiryDate,
        unitPrice: 10,
        status: 'Active'
      });
      console.log(`[+] Seeded Medicine: ${m.brandName} (${m.batchNumber})`);
    }
  }

  // 4. Seed Blood Bank Inventory
  const bloodData = [
    { bagId: 'BB-BAG-00001', bloodGroup: 'B+', componentType: 'Packed Red Blood Cells (PRBC)' },
    { bagId: 'BB-BAG-00002', bloodGroup: 'O+', componentType: 'Fresh Frozen Plasma (FFP)' }
  ];

  for (const b of bloodData) {
    const existing = await bloodBankRepo.findOne({ bagId: b.bagId });
    if (!existing) {
      await bloodBankRepo.create({
        tenantId: 'TNT-000001',
        bagId: b.bagId,
        donorName: 'Voluntary Donor',
        bloodGroup: b.bloodGroup,
        componentType: b.componentType,
        quantityMl: 350,
        issueStatus: 'Available',
        status: 'Active'
      });
      console.log(`[+] Seeded Blood Bag: ${b.bagId} (${b.bloodGroup})`);
    }
  }

  console.log('--- DUMMY TEST DATA SEEDING COMPLETE ---');
  await closeMongo();
}

seedDummyData().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
