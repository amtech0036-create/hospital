const { doctorRepository } = require('../repositories');

class DoctorService {
  async list({ status, search } = {}) {
    let list = await doctorRepository.findAll(status ? { status } : {});
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          (d.phone || '').includes(q)
      );
    }
    return list;
  }

  async create(data) {
    return doctorRepository.create({
      name: data.name,
      specialization: data.specialization || 'General',
      department: data.department || 'Consultant',
      phone: data.phone || '',
      email: data.email || '',
      commissionType: data.commissionType || 'Percentage',
      commissionValue: Number(data.commissionValue) || 10,
      digitalSignatureUrl: data.digitalSignatureUrl || '',
      status: 'Active'
    });
  }

  async update(id, data) {
    return doctorRepository.update(id, data);
  }

  async remove(id) {
    return doctorRepository.delete(id, { hard: true });
  }
}

module.exports = new DoctorService();
