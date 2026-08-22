const { radiologyRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class RadiologyService {
  async list({ search, modality, status, page = 1, limit = 50 } = {}) {
    let items = await radiologyRepository.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.patientName || '').toLowerCase().includes(q) ||
        (i.procedureName || '').toLowerCase().includes(q)
      );
    }

    if (modality) items = items.filter(i => i.modality === modality);
    if (status) items = items.filter(i => i.status === status);

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);

    return {
      orders: items.slice(startIndex, startIndex + Number(limit)),
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

    return radiologyRepository.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Imaging Patient',
      modality: data.modality || 'X-Ray', // X-Ray, CT, MRI, Ultrasound
      procedureName: data.procedureName || 'Chest X-Ray PA View',
      radiologistId: data.radiologistId || 'RAD-01',
      radiologistName: data.radiologistName || 'Dr. Radiologist',
      imageUrls: data.imageUrls || [],
      findings: data.findings || '',
      impression: data.impression || '',
      status: data.status || 'Scheduled'
    });
  }

  async update(id, data) {
    return radiologyRepository.update(id, data);
  }
}

module.exports = new RadiologyService();
