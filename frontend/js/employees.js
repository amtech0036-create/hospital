document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/employees.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Employees';

  const alertBox = document.getElementById('employeeAlert');
  const successBox = document.getElementById('employeeSuccess');
  const modalEl = document.getElementById('employeeModal');
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('employeeForm');
  let editingId = null;
  let allEmployees = [];
  let payrollApi = null;

  function showError(err) {
    successBox.classList.add('d-none');
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }
  function showSuccess(msg) {
    alertBox.classList.add('d-none');
    successBox.textContent = msg;
    successBox.classList.remove('d-none');
  }
  function clearError() {
    alertBox.classList.add('d-none');
  }
  function formatMoney(n) {
    return '৳' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString();
  }
  function toDateInputValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
      if (btn.dataset.tab === 'payrollTab' && payrollApi) {
        payrollApi.refreshEmployees();
        payrollApi.loadPayrollHistory();
      }
    });
  });

  payrollApi = initPayroll({
    showError,
    showSuccess,
    getEmployees: async () => {
      if (!allEmployees.length) {
        const res = await apiRequest('/employees?status=Active');
        return res.data;
      }
      return allEmployees.filter((e) => e.status === 'Active');
    }
  });

  async function loadEmployees(search = '') {
    try {
      const res = await apiRequest(`/employees${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      allEmployees = res.data;
      renderTable(allEmployees);
      if (payrollApi) payrollApi.refreshEmployees();
    } catch (err) {
      showError(err);
    }
  }

  function renderTable(employees) {
    const body = document.getElementById('employeeTableBody');
    if (!employees.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No employees yet.</td></tr>';
      return;
    }
    body.innerHTML = employees
      .map(
        (e) => `
      <tr>
        <td>${e.name}</td>
        <td>${e.phone || ''}</td>
        <td>${e.designation || ''}</td>
        <td>${formatDate(e.joinDate)}</td>
        <td>${formatMoney(e.salary)}</td>
        <td><span class="badge ${e.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${e.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-edit="${e.id}">Edit</button>
          <button class="btn btn-sm btn-outline-success" data-pay="${e.id}">Pay Salary</button>
          <button class="btn btn-sm btn-outline-danger" data-remove="${e.id}">Deactivate</button>
          <button class="btn btn-sm btn-danger" data-delete="${e.id}">Delete</button>
        </td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openEdit(btn.dataset.edit)));
    body.querySelectorAll('[data-pay]').forEach((btn) => btn.addEventListener('click', () => openPaySalary(btn.dataset.pay)));
    body.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => deactivateEmployee(btn.dataset.remove)));
    body.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deleteEmployeePermanently(btn.dataset.delete)));
  }

  function openPaySalary(id) {
    document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
    document.querySelector('[data-tab="payrollTab"]').classList.add('active');
    document.getElementById('payrollTab').classList.remove('d-none');
    payrollApi.refreshEmployees().then(() => {
      payrollApi.selectEmployee(id);
      payrollApi.loadPayrollHistory();
    });
  }

  document.getElementById('addBtn').addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('e_salary').value = '0';
    document.getElementById('e_joinDate').value = toDateInputValue(new Date().toISOString());
    const fpEl = document.getElementById('e_fingerprintId'); if (fpEl) fpEl.value = '';
    const rfidEl = document.getElementById('e_rfidCardNumber'); if (rfidEl) rfidEl.value = '';
    const devUserEl = document.getElementById('e_deviceUserId'); if (devUserEl) devUserEl.value = '';
    const shiftEl = document.getElementById('e_shiftId'); if (shiftEl) shiftEl.value = '';
    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
    modal.show();
  });

  async function openEdit(id) {
    const e = allEmployees.find((x) => x.id === id);
    if (!e) return;
    editingId = id;
    document.getElementById('employeeModalTitle').textContent = `Edit ${e.name}`;
    document.getElementById('e_name').value = e.name;
    document.getElementById('e_phone').value = e.phone || '';
    document.getElementById('e_email').value = e.email || '';
    document.getElementById('e_address').value = e.address || '';
    document.getElementById('e_designation').value = e.designation || '';
    document.getElementById('e_joinDate').value = toDateInputValue(e.joinDate);
    document.getElementById('e_salary').value = e.salary || 0;
    document.getElementById('e_note').value = e.note || '';

    // Fetch Biometric Mapping
    try {
      const bioRes = await apiRequest(`/biometrics/employee/${id}`);
      const bio = bioRes.data || {};
      const fpEl = document.getElementById('e_fingerprintId'); if (fpEl) fpEl.value = bio.fingerprintId || '';
      const rfidEl = document.getElementById('e_rfidCardNumber'); if (rfidEl) rfidEl.value = bio.rfidCardNumber || '';
      const devUserEl = document.getElementById('e_deviceUserId'); if (devUserEl) devUserEl.value = bio.deviceUserId || '';
      const shiftEl = document.getElementById('e_shiftId'); if (shiftEl) shiftEl.value = bio.shiftId || '';
    } catch (err) {
      console.warn('Could not fetch biometric profile', err);
    }

    modal.show();
  }

  async function deactivateEmployee(id) {
    if (!confirm('Deactivate this employee?')) return;
    try {
      await apiRequest(`/employees/${id}`, { method: 'DELETE' });
      loadEmployees();
    } catch (err) {
      showError(err);
    }
  }

  async function deleteEmployeePermanently(id) {
    if (!confirm('Permanently delete this employee? This cannot be undone.')) return;
    try {
      await apiRequest(`/employees/${id}/permanent`, { method: 'DELETE' });
      loadEmployees();
    } catch (err) {
      showError(err);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const joinDateRaw = document.getElementById('e_joinDate').value;
    const payload = {
      name: document.getElementById('e_name').value.trim(),
      phone: document.getElementById('e_phone').value.trim(),
      email: document.getElementById('e_email').value.trim(),
      address: document.getElementById('e_address').value.trim(),
      designation: document.getElementById('e_designation').value.trim(),
      joinDate: joinDateRaw ? new Date(joinDateRaw + 'T00:00:00').toISOString() : undefined,
      salary: parseFloat(document.getElementById('e_salary').value) || 0,
      note: document.getElementById('e_note').value.trim()
    };

    try {
      let savedEmp;
      if (editingId) {
        const res = await apiRequest(`/employees/${editingId}`, { method: 'PUT', body: payload });
        savedEmp = res.data;
      } else {
        const res = await apiRequest('/employees', { method: 'POST', body: payload });
        savedEmp = res.data;
      }

      // Save Biometric Profile if fields are present
      const fpEl = document.getElementById('e_fingerprintId');
      const rfidEl = document.getElementById('e_rfidCardNumber');
      const devUserEl = document.getElementById('e_deviceUserId');
      const shiftEl = document.getElementById('e_shiftId');

      if (savedEmp && savedEmp.id && (fpEl || rfidEl || devUserEl || shiftEl)) {
        await apiRequest('/biometrics', {
          method: 'POST',
          body: {
            employeeId: savedEmp.id,
            fingerprintId: fpEl ? fpEl.value.trim() : '',
            rfidCardNumber: rfidEl ? rfidEl.value.trim() : '',
            deviceUserId: devUserEl ? devUserEl.value.trim() : '',
            shiftId: shiftEl ? shiftEl.value : ''
          }
        });
      }

      modal.hide();
      loadEmployees();
    } catch (err) {
      showError(err);
    }
  });

  let searchTimer = null;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadEmployees(e.target.value.trim()), 300);
  });

  await loadEmployees();
});
