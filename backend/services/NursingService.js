const { nursingRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class NursingService {
  async list({ search, patientId, uhid, page = 1, limit = 50 } = {}) {
    let items = await nursingRepository.findAll({});
    
    if (patientId) items = items.filter(i => i.patientId === patientId);
    if (uhid) items = items.filter(i => i.uhid === uhid);
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.nurseName || '').toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);

    return {
      nursingLogs: items.slice(startIndex, startIndex + Number(limit)),
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async create(data) {
    const tenantId = getCurrentTenantId();
    let uhid = data.uhid;
    if (data.patientId && !uhid) {
      const patient = await patientRepository.findById(data.patientId);
      if (patient) uhid = patient.uhid;
    }

    return nursingRepository.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: uhid || '',
      nurseId: data.nurseId || 'NURSE-01',
      nurseName: data.nurseName || 'Duty Nurse',
      vitalSigns: data.vitalSigns || {},
      marRecords: data.marRecords || [], // Medication Administration Records [{ medicineName, dose, givenAt, givenBy, status }]
      shiftHandover: data.shiftHandover || '',
      careNotes: data.careNotes || '',
      taskStatus: data.taskStatus || 'Completed'
    });
  }
}

module.exports = new NursingService();
