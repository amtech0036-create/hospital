const { otRepository, anesthesiaRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class OTService {
  async list({ search, status, page = 1, limit = 50 } = {}) {
    let items = await otRepository.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.patientName || '').toLowerCase().includes(q) ||
        (i.procedureName || '').toLowerCase().includes(q) ||
        (i.otRoom || '').toLowerCase().includes(q)
      );
    }
    if (status) items = items.filter(i => i.status === status);

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);

    return {
      surgeries: items.slice(startIndex, startIndex + Number(limit)),
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async create(data) {
    const tenantId = getCurrentTenantId();
    let patientName = data.patientName;
    if (data.patientId || data.uhid) {
      const patient = (await patientRepository.findById(data.patientId)) || (await patientRepository.findOne({ uhid: data.uhid }));
      if (patient) {
        data.patientId = patient.id;
        data.uhid = patient.uhid;
        patientName = patient.fullName;
      }
    }

    return otRepository.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'OT Surgery Patient',
      procedureName: data.procedureName || 'Laparoscopic Cholecystectomy',
      otRoom: data.otRoom || 'OT Room 1',
      leadSurgeon: data.leadSurgeon || 'Dr. Chief Surgeon',
      anesthetist: data.anesthetist || 'Dr. Anesthetist Consultant',
      preOpAssessment: data.preOpAssessment || 'Cleared for General Anesthesia',
      checklistVerified: Boolean(data.checklistVerified || true),
      procedureNotes: data.procedureNotes || '',
      postOpNotes: data.postOpNotes || '',
      consumablesUsed: data.consumablesUsed || [],
      scheduledTime: data.scheduledTime || new Date().toISOString(),
      status: data.status || 'Scheduled'
    });
  }

  async update(id, data) {
    return otRepository.update(id, data);
  }
}

module.exports = new OTService();
