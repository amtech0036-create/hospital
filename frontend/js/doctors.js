document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/doctors.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Doctor & Consultant Master Management';

  loadDoctors();

  async function loadDoctors() {
    const tbody = document.getElementById('doctorTableBody');
    try {
      const res = await apiRequest('/doctors');
      const doctors = res.data || [];
      renderTable(doctors);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No doctors registered yet.</td></tr>';
    }
  }

  function renderTable(list) {
    const tbody = document.getElementById('doctorTableBody');
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No doctors registered yet.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((d) => `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td><span class="badge bg-info text-dark">${d.specialization}</span></td>
        <td>${d.department}</td>
        <td>${d.phone || d.email || 'N/A'}</td>
        <td><strong class="text-success">${d.commissionValue || 10} ${d.commissionType === 'Fixed' ? 'BDT' : '%'}</strong></td>
        <td><span class="badge bg-success">${d.status || 'Active'}</span></td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-outline-danger btn-delete-doc" data-id="${d.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-delete-doc').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to deactivate this doctor record?')) return;
        const id = e.currentTarget.dataset.id;
        try {
          await apiRequest(`/doctors/${id}`, { method: 'DELETE' });
          loadDoctors();
        } catch (err) {
          alert(err.message || 'Failed to delete doctor.');
        }
      });
    });
  }

  document.getElementById('doctorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('docName').value.trim(),
      specialization: document.getElementById('docSpecialization').value.trim(),
      department: document.getElementById('docDepartment').value.trim(),
      phone: document.getElementById('docPhone').value.trim(),
      commissionType: document.getElementById('docCommType').value,
      commissionValue: Number(document.getElementById('docCommValue').value)
    };

    try {
      await apiRequest('/doctors', { method: 'POST', body: payload });
      alert('Doctor profile registered successfully.');
      const modalEl = document.getElementById('doctorModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();
      loadDoctors();
    } catch (err) {
      alert(err.message || 'Failed to save doctor.');
    }
  });
});
