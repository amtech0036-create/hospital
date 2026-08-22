const { icuRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class ICUService {
  async list({ search, status, page = 1, limit = 50 } = {}) {
    let items = await icuRepository.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.patientName || '').toLowerCase().includes(q) ||
        (i.bedNumber || '').toLowerCase().includes(q)
      );
    }
    if (status) items = items.filter(i => i.status === status);

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);

    return {
      icuRecords: items.slice(startIndex, startIndex + Number(limit)),
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

    return icuRepository.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'ICU Patient',
      bedNumber: data.bedNumber || 'ICU-Bed-01',
      ventilatorStatus: data.ventilatorStatus || 'Off Ventilator',
      vitalsFlowsheet: data.vitalsFlowsheet || {},
      intakeOutput: data.intakeOutput || {},
      doctorNotes: data.doctorNotes || '',
      nurseNotes: data.nurseNotes || '',
      status: data.status || 'Active Monitoring'
    });
  }

  async update(id, data) {
    return icuRepository.update(id, data);
  }
}

module.exports = new ICUService();
