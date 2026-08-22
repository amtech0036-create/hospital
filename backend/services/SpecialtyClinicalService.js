const { specialtyClinicalRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class SpecialtyClinicalService {
  async list({ department, search, page = 1, limit = 50 } = {}) {
    let items = await specialtyClinicalRepository.findAll({});
    if (department) {
      items = items.filter(i => (i.department || '').toLowerCase() === department.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.patientName || '').toLowerCase().includes(q) ||
        (i.doctorName || '').toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);

    return {
      records: items.slice(startIndex, startIndex + Number(limit)),
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

    return specialtyClinicalRepository.create({
      tenantId,
      department: data.department || 'Cardiology', // Cardiology, ObsGynae, Pediatrics
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Specialty Patient',
      doctorName: data.doctorName || 'Specialist Consultant',
      clinicalDetails: data.clinicalDetails || {},
      status: 'Active'
    });
  }

  async update(id, data) {
    return specialtyClinicalRepository.update(id, data);
  }
}

module.exports = new SpecialtyClinicalService();
