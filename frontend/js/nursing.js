let selectedNursingPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/nursing.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Nursing Care & Medication Administration (MAR)';

  initNursingSearch();
  loadNursingLogs();

  document.getElementById('btnRefreshNursing').addEventListener('click', loadNursingLogs);
  document.getElementById('btnSaveNursing').addEventListener('click', saveNursingLog);
});

function initNursingSearch() {
  new SearchComponent('#nursingPatientSearchContainer', {
    endpoint: '/api/nursing',
    placeholder: 'Filter nursing logs by Patient UHID, Name...',
    displayFormatter: (item) => `${item.uhid || 'Log'} — Nurse ${item.nurseName || 'Duty Nurse'}`,
    subFormatter: (item) => `BP: ${item.vitalSigns?.bp || 'N/A'} | Note: ${item.shiftHandover || 'Checked'}`,
    onSelect: (item) => {
      loadNursingLogs(item.uhid);
    }
  });

  new SearchComponent('#nursingModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for nursing entry...',
    displayFormatter: (patient) => `${patient.uhid} — ${patient.fullName} (${patient.phone || ''})`,
    onSelect: (patient) => {
      selectedNursingPatient = patient;
    }
  });
}

async function loadNursingLogs(uhidFilter = '') {
  const tbody = document.getElementById('nursingTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading nursing records...</td></tr>`;

    let url = `/api/nursing?limit=50`;
    if (uhidFilter) url += `&uhid=${encodeURIComponent(uhidFilter)}`;

    const res = await apiFetch(url);
    const logs = res.data || [];

    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No nursing entries found.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(item => `
      <tr>
        <td class="small fw-semibold text-muted">${new Date(item.createdAt).toLocaleString()}</td>
        <td>
          <span class="fw-bold text-dark">${item.uhid || 'N/A'}</span>
        </td>
        <td class="small">${item.nurseName}</td>
        <td class="small">
          BP: ${item.vitalSigns?.bp || 'N/A'}, Pulse: ${item.vitalSigns?.pulse || 'N/A'}<br/>
          Temp: ${item.vitalSigns?.temp || 'N/A'}, SpO2: ${item.vitalSigns?.spo2 || 'N/A'}
        </td>
        <td class="small text-primary">
          ${item.marRecords && item.marRecords.length ? item.marRecords.map(m => m.medicineName).join(', ') : 'Routine Vitals Check'}
        </td>
        <td class="small text-wrap" style="max-width: 250px;">${item.shiftHandover || item.careNotes || 'N/A'}</td>
        <td><span class="badge bg-success-subtle text-success border border-success">${item.taskStatus}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load nursing logs:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load nursing station data.</td></tr>`;
  }
}

async function saveNursingLog() {
  if (!selectedNursingPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const medicineName = document.getElementById('marMedicine').value.trim();
  const payload = {
    patientId: selectedNursingPatient.id,
    uhid: selectedNursingPatient.uhid,
    nurseName: document.getElementById('nurseName').value.trim(),
    marRecords: medicineName ? [{ medicineName, givenAt: new Date().toISOString(), status: 'Given' }] : [],
    vitalSigns: {
      bp: document.getElementById('nurseBp').value.trim(),
      pulse: document.getElementById('nursePulse').value.trim(),
      temp: document.getElementById('nurseTemp').value.trim(),
      spo2: document.getElementById('nurseSpo2').value.trim()
    },
    shiftHandover: document.getElementById('shiftHandover').value.trim()
  };

  try {
    const res = await apiFetch('/api/nursing', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newNursingLogModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('nursingForm').reset();
      selectedNursingPatient = null;
      loadNursingLogs();
    } else {
      alert(res.message || 'Failed to save nursing log.');
    }
  } catch (err) {
    console.error('Error saving nursing log:', err);
    alert('Failed to connect to server endpoint.');
  }
}
