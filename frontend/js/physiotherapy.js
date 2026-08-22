let selectedPhysioPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/physiotherapy.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Physiotherapy & Rehabilitation Sessions';

  initPhysioSearch();
  loadPhysioSessions();

  document.getElementById('btnRefreshPhysio').addEventListener('click', loadPhysioSessions);
  document.getElementById('btnSavePhysio').addEventListener('click', savePhysioSession);
});

function initPhysioSearch() {
  new SearchComponent('#physioSearchContainer', {
    endpoint: '/api/physiotherapy',
    placeholder: 'Search Therapy Sessions by Patient UHID, Name...',
    displayFormatter: (item) => `${item.uhid || 'Session'} — ${item.patientName || 'Patient'} (${item.treatmentPlan || 'Rehab'})`,
    subFormatter: (item) => `Therapist: ${item.therapistName || 'Duty Therapist'}`,
    onSelect: (item) => {
      loadPhysioSessions(item.uhid);
    }
  });

  new SearchComponent('#physioModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for therapy session...',
    displayFormatter: (patient) => `${patient.uhid} — ${patient.fullName} (${patient.phone || ''})`,
    onSelect: (patient) => {
      selectedPhysioPatient = patient;
    }
  });
}

async function loadPhysioSessions(searchQuery = '') {
  const tbody = document.getElementById('physioTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading therapy sessions...</td></tr>`;

    let url = `/api/physiotherapy?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const sessions = res.data || [];

    if (!sessions.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No therapy sessions recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = sessions.map(item => `
      <tr>
        <td class="small text-muted">${new Date(item.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td class="small fw-semibold">${item.therapistName}</td>
        <td class="small text-primary fw-semibold">${item.treatmentPlan}</td>
        <td class="small text-wrap" style="max-width: 250px;">${item.sessionNotes || item.progressMetrics || 'N/A'}</td>
        <td><span class="badge bg-success-subtle text-success border border-success">${item.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load physiotherapy sessions:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load physiotherapy data.</td></tr>`;
  }
}

async function savePhysioSession() {
  if (!selectedPhysioPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedPhysioPatient.id,
    uhid: selectedPhysioPatient.uhid,
    patientName: selectedPhysioPatient.fullName,
    therapistName: document.getElementById('ptTherapist').value.trim(),
    treatmentPlan: document.getElementById('ptPlan').value.trim(),
    sessionNotes: document.getElementById('ptNotes').value.trim()
  };

  try {
    const res = await apiFetch('/api/physiotherapy', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newPhysioModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('physioForm').reset();
      selectedPhysioPatient = null;
      loadPhysioSessions();
    } else {
      alert(res.message || 'Failed to log therapy session.');
    }
  } catch (err) {
    console.error('Error logging therapy session:', err);
    alert('Failed to connect to physiotherapy endpoint.');
  }
}
