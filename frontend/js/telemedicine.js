let selectedTelemedPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/telemedicine.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Telemedicine & Video Consultations';

  initTelemedSearch();
  loadTelemedSessions();

  document.getElementById('btnRefreshTelemed').addEventListener('click', loadTelemedSessions);
  document.getElementById('btnSaveTelemed').addEventListener('click', saveTelemedSession);
});

function initTelemedSearch() {
  new SearchComponent('#telemedSearchContainer', {
    endpoint: '/api/telemedicine',
    placeholder: 'Search Telemedicine sessions by Patient UHID, Name, Doctor...',
    displayFormatter: (item) => `${item.uhid || 'Telemed'} — ${item.patientName || 'Patient'} (${item.doctorName || 'Doctor'})`,
    subFormatter: (item) => `Date: ${new Date(item.appointmentDate || item.createdAt).toLocaleDateString()} | Status: ${item.status || 'Scheduled'}`,
    onSelect: (item) => {
      loadTelemedSessions(item.uhid);
    }
  });

  new SearchComponent('#telemedModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for video consultation...',
    displayFormatter: (patient) => `${patient.uhid} — ${patient.fullName} (${patient.phone || ''})`,
    onSelect: (patient) => {
      selectedTelemedPatient = patient;
    }
  });
}

async function loadTelemedSessions(searchQuery = '') {
  const tbody = document.getElementById('telemedTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading video consultations...</td></tr>`;

    let url = `/api/telemedicine?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const sessions = res.data || [];

    if (!sessions.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No telemedicine consultations scheduled.</td></tr>`;
      return;
    }

    tbody.innerHTML = sessions.map(item => `
      <tr>
        <td class="small text-muted">${new Date(item.appointmentDate || item.createdAt).toLocaleString()}</td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td class="small fw-semibold">${item.doctorName}</td>
        <td><span class="badge bg-success-subtle text-success border border-success">${item.paymentStatus}</span></td>
        <td>
          <a href="${item.videoRoomUrl}" target="_blank" class="btn btn-sm btn-outline-danger">
            <i class="bi bi-camera-video me-1"></i> Join Video Call
          </a>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary" onclick="sendSmsLink('${item.id}', '${item.videoRoomUrl}')">
            <i class="bi bi-chat-text me-1"></i> Send SMS Link
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load telemedicine sessions:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load video consultations.</td></tr>`;
  }
}

async function saveTelemedSession() {
  if (!selectedTelemedPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedTelemedPatient.id,
    uhid: selectedTelemedPatient.uhid,
    patientName: selectedTelemedPatient.fullName,
    doctorName: document.getElementById('tmDoctor').value.trim(),
    appointmentDate: document.getElementById('tmDate').value || new Date().toISOString()
  };

  try {
    const res = await apiFetch('/api/telemedicine', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newTelemedModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('telemedForm').reset();
      selectedTelemedPatient = null;
      loadTelemedSessions();
    } else {
      alert(res.message || 'Failed to schedule telemedicine.');
    }
  } catch (err) {
    console.error('Error scheduling telemedicine:', err);
    alert('Failed to connect to telemedicine endpoint.');
  }
}

function sendSmsLink(id, url) {
  apiFetch('/api/digital/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      type: 'SMS & WhatsApp',
      recipientPhone: '+8801700000000',
      message: `Dear Patient, your telemedicine video consultation link is: ${url}`
    })
  }).then(res => {
    if (res.success) {
      alert(`SMS & WhatsApp invitation link sent to patient!`);
    }
  });
}
