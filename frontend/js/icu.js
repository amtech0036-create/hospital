let selectedIcuPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/icu.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'ICU / CCU Critical Care Monitoring';

  initIcuSearch();
  loadIcuRecords();

  document.getElementById('btnRefreshIcu').addEventListener('click', loadIcuRecords);
  document.getElementById('btnSaveIcu').addEventListener('click', saveIcuRecord);
});

function initIcuSearch() {
  new SearchComponent('#icuSearchContainer', {
    endpoint: '/api/icu',
    placeholder: 'Search ICU beds by Bed No, UHID, Patient Name...',
    onSelect: (item) => {
      loadIcuRecords(item.uhid || item.bedNumber);
    }
  });

  new SearchComponent('#icuModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for ICU admission...',
    onSelect: (patient) => {
      selectedIcuPatient = patient;
    }
  });
}

async function loadIcuRecords(searchQuery = '') {
  const tbody = document.getElementById('icuTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading ICU flowsheets...</td></tr>`;

    let url = `/api/icu?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const records = res.data || [];

    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No patients currently in ICU.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(item => `
      <tr>
        <td><span class="badge bg-danger p-2">${item.bedNumber}</span></td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td><span class="badge bg-warning-subtle text-dark border border-warning">${item.ventilatorStatus}</span></td>
        <td class="small">
          BP: ${item.vitalsFlowsheet?.bp || 'N/A'}, Pulse: ${item.vitalsFlowsheet?.pulse || 'N/A'}
        </td>
        <td class="small text-muted">
          In: ${item.intakeOutput?.intake || 0} ml | Out: ${item.intakeOutput?.output || 0} ml
        </td>
        <td><span class="badge bg-primary-subtle text-primary border border-primary">${item.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" onclick="viewFlowsheet('${item.id}')">
            <i class="bi bi-graph-up me-1"></i> Flowsheet
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load ICU records:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load ICU flowsheets.</td></tr>`;
  }
}

async function saveIcuRecord() {
  if (!selectedIcuPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedIcuPatient.id,
    uhid: selectedIcuPatient.uhid,
    patientName: selectedIcuPatient.fullName,
    bedNumber: document.getElementById('icuBedNumber').value.trim(),
    ventilatorStatus: document.getElementById('icuVentilator').value,
    vitalsFlowsheet: {
      bp: document.getElementById('icuBp').value.trim(),
      pulse: document.getElementById('icuPulse').value.trim()
    },
    intakeOutput: {
      intake: parseFloat(document.getElementById('icuIntake').value) || 0,
      output: parseFloat(document.getElementById('icuOutput').value) || 0
    },
    doctorNotes: document.getElementById('icuDoctorNotes').value.trim()
  };

  try {
    const res = await apiFetch('/api/icu', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newIcuModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('icuForm').reset();
      selectedIcuPatient = null;
      loadIcuRecords();
    } else {
      alert(res.message || 'Failed to record ICU admission.');
    }
  } catch (err) {
    console.error('Error recording ICU data:', err);
    alert('Failed to connect to ICU endpoint.');
  }
}

function viewFlowsheet(id) {
  alert(`Viewing full ICU vital signs flowsheet for ID ${id}`);
}
