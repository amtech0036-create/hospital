let selectedOtPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/operation-theatre.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Operation Theatre (OT) & Surgery Schedule';

  initOtSearch();
  loadOtSurgeries();

  document.getElementById('btnRefreshOt').addEventListener('click', loadOtSurgeries);
  document.getElementById('btnSaveOt').addEventListener('click', saveOtSurgery);
});

function initOtSearch() {
  new SearchComponent('#otSearchContainer', {
    endpoint: '/api/ot',
    placeholder: 'Search OT schedule by UHID, Patient Name, Procedure, OT Room...',
    displayFormatter: (item) => `${item.otRoom || 'OT'} — ${item.procedureName} (${item.patientName || item.uhid})`,
    subFormatter: (item) => `Surgeon: ${item.leadSurgeon || 'N/A'} | Status: ${item.status || 'Scheduled'}`,
    onSelect: (item) => {
      loadOtSurgeries(item.uhid || item.otRoom);
    }
  });

  new SearchComponent('#otModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for OT surgery...',
    displayFormatter: (patient) => `${patient.uhid} — ${patient.fullName} (${patient.phone || ''})`,
    onSelect: (patient) => {
      selectedOtPatient = patient;
    }
  });
}

async function loadOtSurgeries(searchQuery = '') {
  const tbody = document.getElementById('otTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading OT schedule...</td></tr>`;

    let url = `/api/ot?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const surgeries = res.data || [];

    if (!surgeries.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No surgeries scheduled in OT.</td></tr>`;
      return;
    }

    tbody.innerHTML = surgeries.map(item => `
      <tr>
        <td><span class="badge bg-dark p-2">${item.otRoom}</span></td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td class="fw-semibold text-primary">${item.procedureName}</td>
        <td class="small">${item.leadSurgeon}</td>
        <td class="small text-muted">${item.anesthetist}</td>
        <td>
          ${item.checklistVerified ? '<span class="badge bg-success"><i class="bi bi-check-lg me-1"></i>Verified</span>' : '<span class="badge bg-warning text-dark">Pending</span>'}
        </td>
        <td><span class="badge bg-info-subtle text-info border border-info">${item.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-dark" onclick="addOtNotes('${item.id}')">
            <i class="bi bi-journal-text me-1"></i> Post-Op Notes
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load OT surgeries:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load OT schedule.</td></tr>`;
  }
}

async function saveOtSurgery() {
  if (!selectedOtPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedOtPatient.id,
    uhid: selectedOtPatient.uhid,
    patientName: selectedOtPatient.fullName,
    procedureName: document.getElementById('otProcedure').value.trim(),
    otRoom: document.getElementById('otRoom').value.trim(),
    leadSurgeon: document.getElementById('otSurgeon').value.trim(),
    anesthetist: document.getElementById('otAnesthetist').value.trim(),
    checklistVerified: document.getElementById('otChecklist').checked
  };

  try {
    const res = await apiFetch('/api/ot', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newOtModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('otForm').reset();
      selectedOtPatient = null;
      loadOtSurgeries();
    } else {
      alert(res.message || 'Failed to schedule surgery.');
    }
  } catch (err) {
    console.error('Error scheduling surgery:', err);
    alert('Failed to connect to OT endpoint.');
  }
}

function addOtNotes(id) {
  alert(`Entering procedure & post-op notes for Surgery ID ${id}`);
}
