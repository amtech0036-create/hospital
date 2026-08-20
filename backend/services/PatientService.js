const { patientRepository } = require('../repositories');
const { generateUHID } = require('../utils/barcodeGenerator');
const { getCurrentTenantId } = require('../context/tenantContext');

class PatientService {
  async list({ search, gender, page = 1, limit = 50 } = {}) {
    let patients = await patientRepository.findAll({});
    patients = patients.filter((p) => p.status !== 'Inactive');

    if (search) {
      const q = search.toLowerCase().trim();
      patients = patients.filter(
        (p) =>
          (p.uhid || '').toLowerCase().includes(q) ||
          (p.fullName || '').toLowerCase().includes(q) ||
          (p.phone || '').includes(q)
      );
    }

    if (gender) {
      patients = patients.filter((p) => p.gender === gender);
    }

    const total = patients.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = patients.slice(startIndex, startIndex + Number(limit));

    return {
      patients: paginated,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async getById(id) {
    const patient = await patientRepository.findById(id) || await patientRepository.findOne({ uhid: id });
    if (!patient) {
      const err = new Error(`Patient not found: ${id}`);
      err.status = 404;
      throw err;
    }
    return patient;
  }

  async create(data) {
    const tenantId = getCurrentTenantId();
    const count = await patientRepository.count({});
    const uhid = data.uhid || generateUHID(tenantId, count);

    const ageObj = typeof data.age === 'object'
      ? data.age
      : { value: Number(data.age) || 0, unit: 'Years' };

    return patientRepository.create({
      tenantId,
      uhid,
      fullName: data.fullName,
      gender: data.gender || 'Male',
      age: ageObj,
      dob: data.dob || null,
      bloodGroup: data.bloodGroup || 'Unknown',
      phone: data.phone,
      email: data.email || '',
      address: data.address || {},
      emergencyContact: data.emergencyContact || {},
      referredDoctor: data.referredDoctor || {},
      status: 'Active'
    });
  }

  async update(id, data) {
    await this.getById(id);
    return patientRepository.update(id, data);
  }

  async remove(id) {
    const target = (await patientRepository.findById(id)) || (await patientRepository.findOne({ uhid: id }));
    if (target) {
      return patientRepository.delete(target.id, { hard: true });
    }
    return patientRepository.delete(id, { hard: true });
  }
}

module.exports = new PatientService();
