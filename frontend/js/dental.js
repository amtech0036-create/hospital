let selectedDentalPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/dental.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Dental Department & Procedure Logs';

  initDentalSearch();
  loadDentalRecords();

  document.getElementById('btnRefreshDental').addEventListener('click', loadDentalRecords);
  document.getElementById('btnSaveDental').addEventListener('click', saveDentalRecord);
});

function initDentalSearch() {
  new SearchComponent('#dentalSearchContainer', {
    endpoint: '/api/dental',
    placeholder: 'Search Dental Records by Patient UHID, Name, Tooth...',
    onSelect: (item) => {
      loadDentalRecords(item.uhid);
    }
  });

  new SearchComponent('#dentalModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for dental procedure...',
    onSelect: (patient) => {
      selectedDentalPatient = patient;
    }
  });
}

async function loadDentalRecords(searchQuery = '') {
  const tbody = document.getElementById('dentalTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading dental records...</td></tr>`;

    let url = `/api/dental?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const records = res.data || [];

    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No dental records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(item => `
      <tr>
        <td class="small text-muted">${new Date(item.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td class="small fw-semibold">${item.dentistName}</td>
        <td><span class="badge bg-info-subtle text-info border border-info">${item.toothMatrix}</span></td>
        <td class="small text-wrap" style="max-width: 250px;">${item.procedureDone || item.treatmentPlan || 'N/A'}</td>
        <td><span class="badge bg-success-subtle text-success border border-success">${item.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load dental records:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load dental data.</td></tr>`;
  }
}

async function saveDentalRecord() {
  if (!selectedDentalPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedDentalPatient.id,
    uhid: selectedDentalPatient.uhid,
    patientName: selectedDentalPatient.fullName,
    dentistName: document.getElementById('denDentist').value.trim(),
    toothMatrix: document.getElementById('denTooth').value.trim(),
    procedureDone: document.getElementById('denProcedure').value.trim()
  };

  try {
    const res = await apiFetch('/api/dental', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newDentalModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('dentalForm').reset();
      selectedDentalPatient = null;
      loadDentalRecords();
    } else {
      alert(res.message || 'Failed to save dental record.');
    }
  } catch (err) {
    console.error('Error saving dental record:', err);
    alert('Failed to connect to dental endpoint.');
  }
}
