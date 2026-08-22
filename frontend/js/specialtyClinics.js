let selectedSpecialtyPatient = null;
let currentDepartment = 'Cardiology';

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/specialty-clinics.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Specialty Clinical Modules';

  initSpecialtySearch();
  loadSpecialtyRecords();

  document.querySelectorAll('#specialtyTabs button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#specialtyTabs button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentDepartment = e.target.getAttribute('data-dept');
      loadSpecialtyRecords();
    });
  });

  document.getElementById('btnRefreshSpecialty').addEventListener('click', loadSpecialtyRecords);
  document.getElementById('btnSaveSpecialty').addEventListener('click', saveSpecialtyRecord);
});

function initSpecialtySearch() {
  new SearchComponent('#specialtySearchContainer', {
    endpoint: '/api/specialty-clinics',
    placeholder: 'Search Specialty Records by UHID, Patient Name, Doctor...',
    onSelect: (item) => {
      loadSpecialtyRecords(item.uhid);
    }
  });

  new SearchComponent('#specialtyModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for specialty entry...',
    onSelect: (patient) => {
      selectedSpecialtyPatient = patient;
    }
  });
}

async function loadSpecialtyRecords(searchQuery = '') {
  const tbody = document.getElementById('specialtyTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading ${currentDepartment} records...</td></tr>`;

    let url = `/api/specialty-clinics?department=${currentDepartment}&limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const records = res.data || [];

    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No records found for ${currentDepartment}.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(item => `
      <tr>
        <td><span class="badge bg-primary p-2">${item.department}</span></td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td class="small fw-semibold">${item.doctorName}</td>
        <td class="small text-wrap" style="max-width: 300px;">${item.clinicalDetails?.notes || item.clinicalDetails || 'N/A'}</td>
        <td class="small text-muted">${new Date(item.createdAt).toLocaleDateString()}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" onclick="viewSpecialtyReport('${item.id}')">
            <i class="bi bi-eye me-1"></i> View Report
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load specialty records:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load specialty clinical data.</td></tr>`;
  }
}

async function saveSpecialtyRecord() {
  if (!selectedSpecialtyPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedSpecialtyPatient.id,
    uhid: selectedSpecialtyPatient.uhid,
    patientName: selectedSpecialtyPatient.fullName,
    department: document.getElementById('spDepartment').value,
    doctorName: document.getElementById('spDoctor').value.trim(),
    clinicalDetails: { notes: document.getElementById('spNotes').value.trim() }
  };

  try {
    const res = await apiFetch('/api/specialty-clinics', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newSpecialtyModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('specialtyForm').reset();
      selectedSpecialtyPatient = null;
      loadSpecialtyRecords();
    } else {
      alert(res.message || 'Failed to save specialty record.');
    }
  } catch (err) {
    console.error('Error saving specialty record:', err);
    alert('Failed to connect to specialty endpoint.');
  }
}

function viewSpecialtyReport(id) {
  alert(`Viewing full clinical report for Specialty entry ID ${id}`);
}
