const {
  physiotherapyRepo,
  dentalRepo,
  dieteticsRepo,
  mortuaryRepo,
  biomedicalRepo,
  patientRepository
} = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class SupportingDeptsService {
  // --- Physiotherapy ---
  async listPhysio({ search, page = 1, limit = 50 } = {}) {
    let items = await physiotherapyRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => (i.uhid || '').toLowerCase().includes(q) || (i.patientName || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { sessions: items, pagination: { total: items.length, page: Number(page), limit: Number(limit) } };
  }

  async createPhysio(data) {
    const tenantId = getCurrentTenantId();
    let patientName = data.patientName;
    if (data.patientId || data.uhid) {
      const patient = (await patientRepository.findById(data.patientId)) || (await patientRepository.findOne({ uhid: data.uhid }));
      if (patient) { data.patientId = patient.id; data.uhid = patient.uhid; patientName = patient.fullName; }
    }
    return physiotherapyRepo.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Therapy Patient',
      therapistName: data.therapistName || 'Duty Therapist',
      treatmentPlan: data.treatmentPlan || 'Post-Op Knee Rehab',
      sessionNotes: data.sessionNotes || '',
      progressMetrics: data.progressMetrics || 'Improving Mobility',
      status: 'Active'
    });
  }

  // --- Dental ---
  async listDental({ search, page = 1, limit = 50 } = {}) {
    let items = await dentalRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => (i.uhid || '').toLowerCase().includes(q) || (i.patientName || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { records: items, pagination: { total: items.length, page: Number(page), limit: Number(limit) } };
  }

  async createDental(data) {
    const tenantId = getCurrentTenantId();
    let patientName = data.patientName;
    if (data.patientId || data.uhid) {
      const patient = (await patientRepository.findById(data.patientId)) || (await patientRepository.findOne({ uhid: data.uhid }));
      if (patient) { data.patientId = patient.id; data.uhid = patient.uhid; patientName = patient.fullName; }
    }
    return dentalRepo.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Dental Patient',
      dentistName: data.dentistName || 'Dr. Dentist',
      toothMatrix: data.toothMatrix || 'Tooth #18 - Scaling & Root Planing',
      procedureDone: data.procedureDone || 'Dental Scaling',
      treatmentPlan: data.treatmentPlan || 'Follow up in 2 weeks',
      status: 'Completed'
    });
  }

  // --- Dietetics ---
  async listDiet({ search, page = 1, limit = 50 } = {}) {
    let items = await dieteticsRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => (i.uhid || '').toLowerCase().includes(q) || (i.patientName || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { diets: items, pagination: { total: items.length, page: Number(page), limit: Number(limit) } };
  }

  async createDiet(data) {
    const tenantId = getCurrentTenantId();
    let patientName = data.patientName;
    if (data.patientId || data.uhid) {
      const patient = (await patientRepository.findById(data.patientId)) || (await patientRepository.findOne({ uhid: data.uhid }));
      if (patient) { data.patientId = patient.id; data.uhid = patient.uhid; patientName = patient.fullName; }
    }
    return dieteticsRepo.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Ward Patient',
      dieticianName: data.dieticianName || 'Chief Dietician',
      dietPlanType: data.dietPlanType || 'Low Sodium / Diabetic Soft Diet',
      mealSchedule: data.mealSchedule || 'Breakfast, Lunch, Dinner',
      allergiesDiet: data.allergiesDiet || 'None',
      status: 'Active'
    });
  }

  // --- Mortuary ---
  async listMortuary({ search, page = 1, limit = 50 } = {}) {
    let items = await mortuaryRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => (i.uhid || '').toLowerCase().includes(q) || (i.deceasedName || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { records: items, pagination: { total: items.length, page: Number(page), limit: Number(limit) } };
  }

  async createMortuary(data) {
    const tenantId = getCurrentTenantId();
    return mortuaryRepo.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      deceasedName: data.deceasedName || 'Deceased Record',
      dateOfDeath: data.dateOfDeath || new Date().toISOString(),
      causeOfDeath: data.causeOfDeath || 'Cardiorespiratory Arrest',
      chamberNumber: data.chamberNumber || 'Cold Chamber 03',
      authorizedRecipient: data.authorizedRecipient || '',
      releaseStatus: data.releaseStatus || 'Stored in Mortuary',
      status: 'Recorded'
    });
  }

  // --- Biomedical Equipment ---
  async listBiomedical({ search, page = 1, limit = 50 } = {}) {
    let items = await biomedicalRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => (i.assetTag || '').toLowerCase().includes(q) || (i.equipmentName || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { equipment: items, pagination: { total: items.length, page: Number(page), limit: Number(limit) } };
  }

  async createBiomedical(data) {
    const tenantId = getCurrentTenantId();
    const count = await biomedicalRepo.count({});
    const assetTag = data.assetTag || `BMED-${String(count + 1).padStart(5, '0')}`;

    return biomedicalRepo.create({
      tenantId,
      assetTag,
      equipmentName: data.equipmentName || 'Multipara Patient Monitor',
      modelNumber: data.modelNumber || 'Model-X500',
      department: data.department || 'ICU',
      calibrationDueDate: data.calibrationDueDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      lastServiceDate: data.lastServiceDate || new Date().toISOString(),
      breakdownLogs: [],
      status: 'Operational'
    });
  }
}

module.exports = new SupportingDeptsService();
