const { emergencyRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class EmergencyService {
  async list({ search, triageLevel, status, page = 1, limit = 50 } = {}) {
    let items = await emergencyRepository.findAll({});
    
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.patientName || '').toLowerCase().includes(q) ||
        (i.emergencyId || '').toLowerCase().includes(q)
      );
    }

    if (triageLevel) {
      items = items.filter(i => String(i.triageLevel) === String(triageLevel));
    }

    if (status) {
      items = items.filter(i => i.status === status);
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = items.slice(startIndex, startIndex + Number(limit));

    return {
      emergencies: paginated,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async getById(id) {
    const item = await emergencyRepository.findById(id) || await emergencyRepository.findOne({ emergencyId: id });
    if (!item) {
      const err = new Error(`Emergency record not found: ${id}`);
      err.status = 404;
      throw err;
    }
    return item;
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

    return emergencyRepository.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || 'EMG-TEMP',
      patientName: patientName || 'Unregistered ER Patient',
      triageCategory: data.triageCategory || 'Urgent',
      triageLevel: Number(data.triageLevel) || 3, // 1: Resuscitation, 2: Emergent, 3: Urgent, 4: Less Urgent, 5: Non-Urgent
      vitalSigns: data.vitalSigns || { bp: '', pulse: '', temp: '', respRate: '', spo2: '' },
      chiefComplaint: data.chiefComplaint || '',
      attendingDoctor: data.attendingDoctor || 'On Duty ER Doctor',
      assignedNurse: data.assignedNurse || 'Duty Nurse',
      traumaDetails: data.traumaDetails || '',
      bedNumber: data.bedNumber || 'ER-Bed-01',
      status: data.status || 'Triaged',
      admissionRef: null,
      billingRef: null
    });
  }

  async update(id, data) {
    await this.getById(id);
    return emergencyRepository.update(id, data);
  }
}

module.exports = new EmergencyService();
