let selectedPathologyPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/pathology.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Pathology Worklist & Sample Verification';

  initPathologySearch();
  loadPathologyOrders();

  document.getElementById('btnRefreshPathology').addEventListener('click', loadPathologyOrders);
  document.getElementById('btnSaveLabOrder').addEventListener('click', saveLabOrder);
});

function initPathologySearch() {
  new SearchComponent('#pathologySearchContainer', {
    endpoint: '/api/pathology',
    placeholder: 'Scan Barcode or Search Lab Worklist by UHID, Patient Name, Test...',
    displayFormatter: (item) => `${item.barcode || 'Lab Sample'} — ${item.testName || 'Test'} (${item.patientName || item.uhid || 'Patient'})`,
    subFormatter: (item) => `Category: ${item.category || 'Pathology'} | Status: ${item.status || 'Ordered'}`,
    onSelect: (item) => {
      loadPathologyOrders(item.barcode || item.uhid);
    }
  });

  new SearchComponent('#pathologyModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for pathology lab test...',
    displayFormatter: (patient) => `${patient.uhid} — ${patient.fullName} (${patient.phone || ''})`,
    onSelect: (patient) => {
      selectedPathologyPatient = patient;
    }
  });
}

async function loadPathologyOrders(searchQuery = '') {
  const tbody = document.getElementById('pathologyTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading lab orders...</td></tr>`;

    let url = `/api/pathology?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const orders = res.data || [];

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No pathology orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(item => `
      <tr>
        <td>
          <span class="badge bg-dark font-monospace mb-1">${item.barcode}</span><br/>
          <span class="small text-muted">${new Date(item.createdAt).toLocaleDateString()}</span>
        </td>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td>
          <div class="fw-semibold text-primary">${item.testName}</div>
          <div class="extra-small text-muted">${item.category}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${item.sampleType}</span></td>
        <td class="small">${item.technicianId || 'Technician 1'}</td>
        <td><span class="badge bg-info-subtle text-info border border-info">${item.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success me-1" onclick="verifyResults('${item.id}')">
            <i class="bi bi-check-circle me-1"></i> Result Entry
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load pathology orders:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load lab worklist.</td></tr>`;
  }
}

async function saveLabOrder() {
  if (!selectedPathologyPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedPathologyPatient.id,
    uhid: selectedPathologyPatient.uhid,
    patientName: selectedPathologyPatient.fullName,
    testName: document.getElementById('labTestName').value.trim(),
    category: document.getElementById('labCategory').value.trim(),
    sampleType: document.getElementById('labSampleType').value.trim()
  };

  try {
    const res = await apiFetch('/api/pathology', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newLabOrderModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('pathologyForm').reset();
      selectedPathologyPatient = null;
      loadPathologyOrders();
    } else {
      alert(res.message || 'Failed to create pathology order.');
    }
  } catch (err) {
    console.error('Error creating lab order:', err);
    alert('Failed to connect to pathology endpoint.');
  }
}

function verifyResults(id) {
  alert(`Entering multi-parameter results for lab order ID ${id}`);
}

async function loadTests() {
  if (!selectedPathologyPatient || !selectedPathologyPatient.uhid) {
    alert('Please select a patient first to load diagnostic billed tests.');
    return;
  }

  try {
    const res = await apiFetch(`/api/diagnostics/orders?search=${encodeURIComponent(selectedPathologyPatient.uhid)}`);
    const orders = res.data || [];
    
    if (!orders.length) {
      alert(`No diagnostic bill invoices found for patient ${selectedPathologyPatient.fullName} (${selectedPathologyPatient.uhid}).`);
      return;
    }

    const tests = [];
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          tests.push({
            name: item.testName || item.name || item.title || 'Diagnostic Test',
            category: item.category || 'Pathology',
            sampleType: item.sampleType || 'EDTA Whole Blood'
          });
        });
      }
    });

    if (!tests.length) {
      alert('Diagnostic invoice found, but no pathology test items were listed.');
      return;
    }

    const firstTest = tests[0];
    document.getElementById('labTestName').value = firstTest.name;
    if (firstTest.category) document.getElementById('labCategory').value = firstTest.category;
    if (firstTest.sampleType) document.getElementById('labSampleType').value = firstTest.sampleType;

    alert(`Loaded test "${firstTest.name}" from Diagnostic Invoice for ${selectedPathologyPatient.fullName}.`);
  } catch (err) {
    console.error('Error loading diagnostic tests:', err);
    alert('Failed to load tests from diagnostic bill invoices.');
  }
}
