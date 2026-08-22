let selectedModalPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/emergency.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Emergency Queue & Triage';

  initSearchComponents();
  loadEmergencyQueue();

  document.getElementById('btnRefreshER').addEventListener('click', loadEmergencyQueue);
  document.getElementById('triageFilter').addEventListener('change', loadEmergencyQueue);
  document.getElementById('btnSaveEmergency').addEventListener('click', saveEmergencyPatient);
});

function initSearchComponents() {
  new SearchComponent('#erPatientSearchContainer', {
    endpoint: '/api/patients',
    placeholder: 'Search ER queue by UHID, patient name...',
    onSelect: (item) => {
      loadEmergencyQueue(item.uhid);
    }
  });

  new SearchComponent('#modalPatientSearchContainer', {
    endpoint: '/api/patients',
    placeholder: 'Search patient database by UHID, Name, Mobile...',
    onSelect: (patient) => {
      selectedModalPatient = patient;
      document.getElementById('erPatientName').value = patient.fullName;
    }
  });
}

async function loadEmergencyQueue(searchQuery = '') {
  const tbody = document.getElementById('erQueueTableBody');
  const triageFilter = document.getElementById('triageFilter').value;

  try {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading ER queue...</td></tr>`;

    let url = `/api/emergency?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (triageFilter) url += `&triageLevel=${triageFilter}`;

    const res = await apiFetch(url);
    const emergencies = res.data || [];

    if (!emergencies.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No emergency cases found in queue.</td></tr>`;
      return;
    }

    tbody.innerHTML = emergencies.map(item => {
      const badgeColor = {
        1: 'bg-danger text-white fw-bold',
        2: 'bg-warning text-dark fw-bold',
        3: 'bg-primary text-white',
        4: 'bg-success text-white',
        5: 'bg-info text-dark'
      }[item.triageLevel] || 'bg-secondary';

      const levelLabel = {
        1: 'L1 - Resuscitation',
        2: 'L2 - Emergent',
        3: 'L3 - Urgent',
        4: 'L4 - Less Urgent',
        5: 'L5 - Non-Urgent'
      }[item.triageLevel] || `Level ${item.triageLevel}`;

      return `
        <tr>
          <td><span class="badge ${badgeColor} p-2">${levelLabel}</span></td>
          <td>
            <div class="fw-bold text-dark">${item.patientName}</div>
            <div class="small text-muted">UHID: ${item.uhid} | ID: ${item.id}</div>
          </td>
          <td><span class="badge bg-light text-dark border">${item.bedNumber}</span></td>
          <td class="small">
            BP: ${item.vitalSigns?.bp || 'N/A'}<br/>
            Pulse: ${item.vitalSigns?.pulse || 'N/A'}, Temp: ${item.vitalSigns?.temp || 'N/A'}
          </td>
          <td class="small text-wrap" style="max-width: 200px;">${item.chiefComplaint || 'N/A'}</td>
          <td class="small fw-semibold">${item.attendingDoctor}</td>
          <td><span class="badge bg-soft-primary text-primary border">${item.status}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" onclick="viewErDetails('${item.id}')">
              <i class="bi bi-eye"></i> Triage
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load ER queue:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load emergency queue data.</td></tr>`;
  }
}

async function saveEmergencyPatient() {
  const patientName = document.getElementById('erPatientName').value.trim();
  if (!patientName) {
    alert('Please provide patient name or select an existing patient.');
    return;
  }

  const payload = {
    patientId: selectedModalPatient ? selectedModalPatient.id : null,
    uhid: selectedModalPatient ? selectedModalPatient.uhid : null,
    patientName,
    triageLevel: parseInt(document.getElementById('erTriageLevel').value, 10),
    bedNumber: document.getElementById('erBedNumber').value.trim(),
    attendingDoctor: document.getElementById('erDoctor').value.trim(),
    chiefComplaint: document.getElementById('erChiefComplaint').value.trim(),
    vitalSigns: {
      bp: document.getElementById('erBp').value.trim(),
      pulse: document.getElementById('erPulse').value.trim(),
      temp: document.getElementById('erTemp').value.trim(),
      spo2: document.getElementById('erSpo2').value.trim()
    }
  };

  try {
    const res = await apiFetch('/api/emergency', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newEmergencyModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('emergencyForm').reset();
      selectedModalPatient = null;
      loadEmergencyQueue();
    } else {
      alert(res.message || 'Failed to register ER patient.');
    }
  } catch (err) {
    console.error('Error saving emergency record:', err);
    alert('Failed to connect to emergency server endpoint.');
  }
}

function viewErDetails(id) {
  alert(`Opening triage management for Emergency record ${id}`);
}
