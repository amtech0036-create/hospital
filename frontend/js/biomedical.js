document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/biomedical.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Biomedical Equipment & Asset Maintenance';

  initBiomedicalSearch();
  loadBiomedicalEquipment();

  document.getElementById('btnRefreshBiomedical').addEventListener('click', loadBiomedicalEquipment);
  document.getElementById('btnSaveBiomedical').addEventListener('click', saveBiomedicalAsset);
});

function initBiomedicalSearch() {
  new SearchComponent('#biomedicalSearchContainer', {
    endpoint: '/api/biomedical',
    placeholder: 'Search Asset Tag, Equipment Name, Department...',
    onSelect: (item) => {
      loadBiomedicalEquipment(item.assetTag || item.equipmentName);
    }
  });
}

async function loadBiomedicalEquipment(searchQuery = '') {
  const tbody = document.getElementById('biomedicalTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading biomedical inventory...</td></tr>`;

    let url = `/api/biomedical?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const items = res.data || [];

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No biomedical equipment registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td><span class="badge bg-dark font-monospace p-2">${item.assetTag}</span></td>
        <td>
          <div class="fw-bold text-dark">${item.equipmentName}</div>
          <div class="small text-muted">Model: ${item.modelNumber || 'N/A'}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${item.department}</span></td>
        <td class="small text-muted">${new Date(item.lastServiceDate || item.createdAt).toLocaleDateString()}</td>
        <td class="small text-danger fw-semibold">${new Date(item.calibrationDueDate || Date.now()).toLocaleDateString()}</td>
        <td><span class="badge bg-success-subtle text-success border border-success">${item.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load biomedical equipment:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load equipment data.</td></tr>`;
  }
}

async function saveBiomedicalAsset() {
  const payload = {
    equipmentName: document.getElementById('bmedName').value.trim(),
    modelNumber: document.getElementById('bmedModel').value.trim(),
    department: document.getElementById('bmedDept').value.trim(),
    calibrationDueDate: document.getElementById('bmedCalibration').value || null
  };

  try {
    const res = await apiFetch('/api/biomedical', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newEquipmentModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('biomedicalForm').reset();
      loadBiomedicalEquipment();
    } else {
      alert(res.message || 'Failed to register equipment.');
    }
  } catch (err) {
    console.error('Error registering equipment:', err);
    alert('Failed to connect to biomedical endpoint.');
  }
}
