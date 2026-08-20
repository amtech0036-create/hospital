document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/patients.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Patient Directory & UHID Master';

  let cachedPatients = [];
  loadPatients();

  document.getElementById('searchPatientInput')?.addEventListener('input', filterPatients);
  document.getElementById('genderFilter')?.addEventListener('change', filterPatients);
  document.getElementById('btnRefreshPatients')?.addEventListener('click', loadPatients);

  async function loadPatients() {
    const tbody = document.getElementById('patientTableBody');
    try {
      const res = await apiRequest('/patients');
      cachedPatients = res.data || [];
      renderTable(cachedPatients);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-3">Failed to load patient directory.</td></tr>';
    }
  }

  function filterPatients() {
    const q = (document.getElementById('searchPatientInput').value || '').toLowerCase().trim();
    const gender = document.getElementById('genderFilter').value;

    const filtered = cachedPatients.filter((p) => {
      const matchesQ =
        !q ||
        (p.uhid || p.id || '').toLowerCase().includes(q) ||
        (p.fullName || p.name || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(q);
      const matchesGender = !gender || p.gender === gender;
      return matchesQ && matchesGender;
    });

    renderTable(filtered);
  }

  function renderTable(list) {
    const tbody = document.getElementById('patientTableBody');
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No patients found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((p) => `
      <tr>
        <td><strong class="text-primary">${p.uhid || p.id}</strong></td>
        <td><strong>${p.fullName || p.name}</strong></td>
        <td>${p.gender || 'Male'} / ${typeof p.age === 'object' ? p.age.value + ' ' + (p.age.unit || 'Years') : p.age || 30}</td>
        <td>${p.phone || 'N/A'}</td>
        <td><span class="badge bg-secondary">${p.bloodGroup || 'Unknown'}</span></td>
        <td><small class="text-muted">${p.emergencyContact?.name || p.emergencyContact || 'N/A'}</small></td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-outline-primary btn-edit-patient" data-id="${p.id}"><i class="bi bi-pencil me-1"></i>Edit</button>
          <button type="button" class="btn btn-sm btn-outline-danger btn-delete-patient" data-id="${p.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');

    // Bind Edit Action Buttons
    tbody.querySelectorAll('.btn-edit-patient').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const patient = cachedPatients.find((p) => p.id === id);
        if (!patient) return;

        document.getElementById('modalPatientId').value = patient.id;
        document.getElementById('modalUhid').value = patient.uhid || patient.id;
        document.getElementById('modalFullName').value = patient.fullName || patient.name || '';
        document.getElementById('modalGender').value = patient.gender || 'Male';
        document.getElementById('modalAge').value = typeof patient.age === 'object' ? patient.age.value : patient.age || 30;
        document.getElementById('modalBloodGroup').value = patient.bloodGroup || 'Unknown';
        document.getElementById('modalPhone').value = patient.phone || '';
        document.getElementById('modalEmail').value = patient.email || '';
        document.getElementById('modalEmergencyContact').value = patient.emergencyContact?.name || patient.emergencyContact || '';

        document.getElementById('patientModalTitle').innerHTML = '<i class="bi bi-pencil-square me-2"></i>Edit Patient Record';
        const modalEl = document.getElementById('patientModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      });
    });

    // Bind Delete Action Buttons
    tbody.querySelectorAll('.btn-delete-patient').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to delete this patient record?')) return;
        const id = e.currentTarget.dataset.id;
        try {
          await apiRequest(`/patients/${id}`, { method: 'DELETE' });
          cachedPatients = cachedPatients.filter((p) => p.id !== id && p.uhid !== id);
          renderTable(cachedPatients);
          loadPatients();
        } catch (err) {
          alert(err.message || 'Failed to delete patient.');
        }
      });
    });
  }

  // Modal Form Submission for Add & Edit
  document.getElementById('modalPatientForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('modalPatientId').value;
    const payload = {
      fullName: document.getElementById('modalFullName').value.trim(),
      gender: document.getElementById('modalGender').value,
      age: { value: Number(document.getElementById('modalAge').value), unit: 'Years' },
      bloodGroup: document.getElementById('modalBloodGroup').value,
      phone: document.getElementById('modalPhone').value.trim(),
      email: document.getElementById('modalEmail').value.trim(),
      emergencyContact: { name: document.getElementById('modalEmergencyContact').value.trim() }
    };

    try {
      if (id) {
        // Edit Mode
        const res = await apiRequest(`/patients/${id}`, { method: 'PUT', body: payload });
        const updated = res.data;
        const idx = cachedPatients.findIndex((p) => p.id === id);
        if (idx !== -1) cachedPatients[idx] = updated;
      } else {
        // Create Mode
        const res = await apiRequest('/patients', { method: 'POST', body: payload });
        cachedPatients.unshift(res.data);
      }

      renderTable(cachedPatients);

      const modalEl = document.getElementById('patientModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      document.getElementById('modalPatientForm').reset();
      document.getElementById('modalPatientId').value = '';
    } catch (err) {
      alert(err.message || 'Failed to save patient.');
    }
  });
});
