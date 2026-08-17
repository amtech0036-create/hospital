const { departmentRepository, employeeRepository } = require('../repositories');

class DepartmentService {
  async list({ status } = {}) {
    let departments = await departmentRepository.findAll(status ? { status } : {});
    const employees = await employeeRepository.findAll();

    // Compute live employee count for each department
    const counts = {};
    employees.forEach((e) => {
      if (e.departmentId && e.status === 'Active') {
        counts[e.departmentId] = (counts[e.departmentId] || 0) + 1;
      }
    });

    return departments.map((d) => ({
      ...d,
      employeeCount: counts[d.id] || 0
    }));
  }

  async getById(id) {
    const dept = await departmentRepository.findById(id);
    if (!dept) {
      const err = new Error('Department not found.');
      err.status = 404;
      throw err;
    }
    const employees = await employeeRepository.findAll({ departmentId: id });
    return { ...dept, employeeCount: employees.filter((e) => e.status === 'Active').length };
  }

  async create(input) {
    const { name, code, managerId = '', description = '' } = input;
    if (!name || !name.trim()) {
      const err = new Error('Department name is required.');
      err.status = 422;
      throw err;
    }

    const dept = await departmentRepository.create({
      name: name.trim(),
      code: (code || name.slice(0, 3)).toUpperCase().trim(),
      managerId,
      description: description.trim(),
      status: 'Active'
    });

    return this.getById(dept.id);
  }

  async update(id, input) {
    await this.getById(id);
    const updated = await departmentRepository.update(id, input);
    return this.getById(updated.id);
  }

  async remove(id) {
    await this.getById(id);
    return departmentRepository.delete(id);
  }
}

module.exports = new DepartmentService();
