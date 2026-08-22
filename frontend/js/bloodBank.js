document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/blood-bank.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Blood Bank Inventory & Cross-Matching';

  initBloodBankSearch();
  loadBloodInventory();

  document.getElementById('btnRefreshBloodBank').addEventListener('click', loadBloodInventory);
  document.getElementById('btnSaveBloodBag').addEventListener('click', saveBloodBag);
});

function initBloodBankSearch() {
  new SearchComponent('#bloodBankSearchContainer', {
    endpoint: '/api/blood-bank',
    placeholder: 'Search Blood Group, Bag ID, Donor Name, Patient UHID...',
    onSelect: (item) => {
      loadBloodInventory(item.bloodGroup || item.bagId);
    }
  });
}

async function loadBloodInventory(searchQuery = '') {
  const tbody = document.getElementById('bloodBankTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading blood bank inventory...</td></tr>`;

    let url = `/api/blood-bank?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const items = res.data || [];

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No blood bags in inventory.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td><span class="badge bg-danger fs-6 px-3 py-1.5">${item.bloodGroup}</span></td>
        <td>
          <div class="fw-bold font-monospace text-dark">${item.bagId}</div>
          <div class="small text-muted">Donor: ${item.donorName}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${item.componentType}</span></td>
        <td class="fw-semibold">${item.quantityMl} ml</td>
        <td class="small text-muted">${new Date(item.expiryDate).toLocaleDateString()}</td>
        <td class="small">${item.crossMatchPatientUhid ? `<span class="badge bg-primary-subtle text-primary border border-primary">${item.crossMatchPatientUhid}</span>` : '<span class="text-muted">Unreserved</span>'}</td>
        <td><span class="badge bg-success-subtle text-success border border-success">${item.issueStatus || 'Available'}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" onclick="crossMatchBag('${item.id}')">
            <i class="bi bi-person-check me-1"></i> Cross-Match
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load blood inventory:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load blood bank data.</td></tr>`;
  }
}

async function saveBloodBag() {
  const payload = {
    bloodGroup: document.getElementById('bbBloodGroup').value,
    donorName: document.getElementById('bbDonorName').value.trim() || 'Voluntary Donor',
    componentType: document.getElementById('bbComponent').value,
    quantityMl: parseFloat(document.getElementById('bbQuantity').value) || 350
  };

  try {
    const res = await apiFetch('/api/blood-bank', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newBloodBagModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('bloodBagForm').reset();
      loadBloodInventory();
    } else {
      alert(res.message || 'Failed to register blood bag.');
    }
  } catch (err) {
    console.error('Error saving blood bag:', err);
    alert('Failed to connect to blood bank endpoint.');
  }
}

function crossMatchBag(id) {
  const uhid = prompt('Enter Patient UHID for Cross-Matching & Compatibility Reservation:');
  if (!uhid) return;

  apiFetch(`/api/blood-bank/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ crossMatchPatientUhid: uhid, issueStatus: 'Reserved / Cross-Matched' })
  }).then(res => {
    if (res.success) {
      alert(`Blood bag successfully reserved and cross-matched for UHID: ${uhid}`);
      loadBloodInventory();
    }
  });
}
