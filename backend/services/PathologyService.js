const { pathologyRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class PathologyService {
  async list({ search, status, category, page = 1, limit = 50 } = {}) {
    let items = await pathologyRepository.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.patientName || '').toLowerCase().includes(q) ||
        (i.testName || '').toLowerCase().includes(q) ||
        (i.barcode || '').toLowerCase().includes(q)
      );
    }

    if (status) items = items.filter(i => i.status === status);
    if (category) items = items.filter(i => i.category === category);

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

    const count = await pathologyRepository.count({});
    const barcode = data.barcode || `LAB-${String(count + 1).padStart(6, '0')}`;

    return pathologyRepository.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Walk-in Lab Patient',
      testId: data.testId || 'LAB-TEST',
      testName: data.testName || 'Complete Blood Count (CBC)',
      category: data.category || 'Hematology',
      sampleType: data.sampleType || 'EDTA Blood',
      barcode,
      sampleStatus: data.sampleStatus || 'Collected',
      technicianId: data.technicianId || 'TECH-01',
      results: data.results || [],
      criticalAlert: Boolean(data.criticalAlert),
      verifiedBy: data.verifiedBy || null,
      status: data.status || 'Sample Collected'
    });
  }

  async update(id, data) {
    return pathologyRepository.update(id, data);
  }
}

module.exports = new PathologyService();
