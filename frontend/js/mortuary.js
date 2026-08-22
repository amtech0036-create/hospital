let selectedMortuaryPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/mortuary.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Mortuary Management & Death Records';

  initMortuarySearch();
  loadMortuaryRecords();

  document.getElementById('btnRefreshMortuary').addEventListener('click', loadMortuaryRecords);
  document.getElementById('btnSaveMortuary').addEventListener('click', saveMortuaryRecord);
});

function initMortuarySearch() {
  new SearchComponent('#mortuarySearchContainer', {
    endpoint: '/api/mortuary',
    placeholder: 'Search Mortuary Records by UHID, Deceased Name, Chamber...',
    displayFormatter: (item) => `${item.chamberNumber || 'Mortuary'} — ${item.deceasedName} (${item.causeOfDeath || 'Deceased'})`,
    subFormatter: (item) => `Status: ${item.releaseStatus || 'Stored'} | Kin: ${item.authorizedRecipient || 'Unclaimed'}`,
    onSelect: (item) => {
      loadMortuaryRecords(item.uhid || item.deceasedName);
    }
  });

  new SearchComponent('#mortuaryModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient record for death registration...',
    displayFormatter: (patient) => `${patient.uhid} — ${patient.fullName} (${patient.phone || ''})`,
    onSelect: (patient) => {
      selectedMortuaryPatient = patient;
      document.getElementById('mortDeceasedName').value = patient.fullName;
    }
  });
}

async function loadMortuaryRecords(searchQuery = '') {
  const tbody = document.getElementById('mortuaryTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading mortuary records...</td></tr>`;

    let url = `/api/mortuary?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const records = res.data || [];

    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No mortuary records logged.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(item => `
      <tr>
        <td><span class="badge bg-secondary p-2">${item.chamberNumber}</span></td>
        <td>
          <div class="fw-bold text-dark">${item.deceasedName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td class="small text-muted">${new Date(item.dateOfDeath).toLocaleString()}</td>
        <td class="small text-wrap" style="max-width: 250px;">${item.causeOfDeath}</td>
        <td class="small fw-semibold">${item.authorizedRecipient || 'Unclaimed'}</td>
        <td><span class="badge bg-dark">${item.releaseStatus}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load mortuary records:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load mortuary logs.</td></tr>`;
  }
}

async function saveMortuaryRecord() {
  const deceasedName = document.getElementById('mortDeceasedName').value.trim();
  if (!deceasedName) {
    alert('Please enter deceased name or select patient record.');
    return;
  }

  const payload = {
    patientId: selectedMortuaryPatient ? selectedMortuaryPatient.id : null,
    uhid: selectedMortuaryPatient ? selectedMortuaryPatient.uhid : '',
    deceasedName,
    chamberNumber: document.getElementById('mortChamber').value.trim(),
    causeOfDeath: document.getElementById('mortCause').value.trim(),
    authorizedRecipient: document.getElementById('mortRecipient').value.trim()
  };

  try {
    const res = await apiFetch('/api/mortuary', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newMortuaryModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('mortuaryForm').reset();
      selectedMortuaryPatient = null;
      loadMortuaryRecords();
    } else {
      alert(res.message || 'Failed to save mortuary record.');
    }
  } catch (err) {
    console.error('Error saving mortuary record:', err);
    alert('Failed to connect to mortuary endpoint.');
  }
}
