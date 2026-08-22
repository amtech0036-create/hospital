let selectedRadiologyPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/radiology.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Radiology & Imaging Worklist';

  initRadiologySearch();
  loadRadiologyOrders();

  document.getElementById('btnRefreshRadiology').addEventListener('click', loadRadiologyOrders);
  document.getElementById('btnSaveRadiology').addEventListener('click', saveRadiologyOrder);
});

function initRadiologySearch() {
  new SearchComponent('#radiologySearchContainer', {
    endpoint: '/api/radiology',
    placeholder: 'Search Radiology Worklist by UHID, Patient Name, Procedure...',
    onSelect: (item) => {
      loadRadiologyOrders(item.uhid);
    }
  });

  new SearchComponent('#radiologyModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for imaging order...',
    onSelect: (patient) => {
      selectedRadiologyPatient = patient;
    }
  });
}

async function loadRadiologyOrders(searchQuery = '') {
  const tbody = document.getElementById('radiologyTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading radiology orders...</td></tr>`;

    let url = `/api/radiology?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const orders = res.data || [];

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No imaging orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(item => `
      <tr>
        <td><span class="badge bg-primary-subtle text-primary border border-primary px-2.5 py-1.5">${item.modality}</span></td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td class="fw-semibold text-dark">${item.procedureName}</td>
        <td class="small text-muted">${item.radiologistName || 'Dr. Radiologist'}</td>
        <td><span class="badge bg-warning-subtle text-dark border border-warning">${item.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-info me-1" onclick="writeReport('${item.id}')">
            <i class="bi bi-file-earmark-medical me-1"></i> Add Findings
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load radiology worklist:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load radiology worklist.</td></tr>`;
  }
}

async function saveRadiologyOrder() {
  if (!selectedRadiologyPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedRadiologyPatient.id,
    uhid: selectedRadiologyPatient.uhid,
    patientName: selectedRadiologyPatient.fullName,
    modality: document.getElementById('radModality').value,
    procedureName: document.getElementById('radProcedure').value.trim(),
    radiologistName: document.getElementById('radDoctor').value.trim()
  };

  try {
    const res = await apiFetch('/api/radiology', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newRadiologyOrderModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('radiologyForm').reset();
      selectedRadiologyPatient = null;
      loadRadiologyOrders();
    } else {
      alert(res.message || 'Failed to create imaging order.');
    }
  } catch (err) {
    console.error('Error creating imaging order:', err);
    alert('Failed to connect to radiology endpoint.');
  }
}

function writeReport(id) {
  alert(`Opening findings & report editor for Radiology order ID ${id}`);
}
