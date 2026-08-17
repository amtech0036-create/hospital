const { employeeRepository, salaryRepository } = require('../repositories');

class EmployeeService {
  async list({ status, search } = {}) {
    let employees = await employeeRepository.findAll(status ? { status } : {});

    if (search) {
      const q = search.toLowerCase();
      employees = employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.phone || '').includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q) ||
          (e.departmentName || '').toLowerCase().includes(q)
      );
    }

    return employees.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      const err = new Error('Employee not found.');
      err.status = 404;
      throw err;
    }
    return employee;
  }

  async create(input) {
    const { name, phone, email, address, designation, departmentId, departmentName, joinDate, salary, note } = input;
    let deptName = departmentName || '';
    if (departmentId && !deptName) {
      const { departmentRepository } = require('../repositories');
      const dept = await departmentRepository.findById(departmentId);
      if (dept) deptName = dept.name;
    }

    return employeeRepository.create({
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      designation: designation || '',
      departmentId: departmentId || '',
      departmentName: deptName,
      joinDate: joinDate || new Date().toISOString(),
      salary: salary || 0,
      note: note || '',
      status: 'Active'
    });
  }

  async update(id, input) {
    await this.getById(id);
    const allowed = ['name', 'phone', 'email', 'address', 'designation', 'departmentId', 'departmentName', 'joinDate', 'salary', 'note', 'status'];
    const payload = {};
    for (const key of allowed) {
      if (input[key] !== undefined) payload[key] = input[key];
    }
    if (payload.departmentId !== undefined) {
      if (payload.departmentId && !payload.departmentName) {
        const { departmentRepository } = require('../repositories');
        const dept = await departmentRepository.findById(payload.departmentId);
        if (dept) payload.departmentName = dept.name;
      } else if (!payload.departmentId && !payload.departmentName) {
        payload.departmentName = '';
      }
    }
    return employeeRepository.update(id, payload);
  }

  async remove(id, { hard = false } = {}) {
    await this.getById(id);
    if (hard) {
      const payrollRecords = await salaryRepository.findByEmployee(id);
      if (payrollRecords.length > 0) {
        const err = new Error(
          'This employee has payroll history and cannot be permanently deleted. Deactivate instead.'
        );
        err.status = 409;
        throw err;
      }
      return employeeRepository.delete(id, { hard: true });
    }
    return employeeRepository.delete(id);
  }

  async countActive() {
    const employees = await employeeRepository.findAll({ status: 'Active' });
    return employees.length;
  }
}

module.exports = new EmployeeService();
