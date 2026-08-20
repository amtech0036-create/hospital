document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/diagnostic-tests.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Diagnostic Test Catalog Master';

  let localTestCatalog = [];
  loadTestCatalog();

  async function loadTestCatalog() {
    const tbody = document.getElementById('testCatalogTbody');
    try {
      const res = await apiRequest('/diagnostics/tests');
      localTestCatalog = res.data || [];
      renderTable(localTestCatalog);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-3">Failed to load diagnostic test catalog.</td></tr>';
    }
  }

  function renderTable(list) {
    const tbody = document.getElementById('testCatalogTbody');
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">No diagnostic tests registered.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((t) => `
      <tr>
        <td><strong class="text-primary">${t.code}</strong></td>
        <td><strong>${t.name}</strong></td>
        <td><span class="badge ${t.department === 'Pathology' ? 'bg-info' : 'bg-warning'} text-dark">${t.department}</span></td>
        <td>${t.category || 'General'}</td>
        <td><small class="text-muted">${t.sampleType || 'N/A'}</small></td>
        <td><strong class="text-success">${Number(t.price || 0).toFixed(2)} BDT</strong></td>
        <td><span class="badge bg-success">${t.status || 'Active'}</span></td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-outline-primary btn-edit-test" data-id="${t.id}"><i class="bi bi-pencil me-1"></i>Edit</button>
          <button type="button" class="btn btn-sm btn-outline-danger btn-delete-test" data-id="${t.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');

    // Bind Edit Buttons
    tbody.querySelectorAll('.btn-edit-test').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const test = localTestCatalog.find((item) => item.id === id);
        if (!test) return;

        document.getElementById('catalogId').value = test.id;
        document.getElementById('catalogCode').value = test.code;
        document.getElementById('catalogName').value = test.name;
        document.getElementById('catalogDept').value = test.department;
        document.getElementById('catalogCategory').value = test.category;
        document.getElementById('catalogPrice').value = test.price;
        document.getElementById('catalogSampleType').value = test.sampleType || '';
        document.getElementById('catalogContainer').value = test.specimenContainer || '';

        const modalEl = document.getElementById('testModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      });
    });

    // Bind Delete Buttons
    tbody.querySelectorAll('.btn-delete-test').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to deactivate this test master record?')) return;
        const id = e.currentTarget.dataset.id;
        try {
          await apiRequest(`/diagnostics/tests/${id}`, { method: 'DELETE' });
          loadTestCatalog();
        } catch (err) {
          alert(err.message || 'Failed to delete test.');
        }
      });
    });
  }

  // Submit Handler for Add / Edit Modal
  document.getElementById('testForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('catalogId').value;
    const payload = {
      code: document.getElementById('catalogCode').value.trim(),
      name: document.getElementById('catalogName').value.trim(),
      department: document.getElementById('catalogDept').value,
      category: document.getElementById('catalogCategory').value.trim(),
      price: Number(document.getElementById('catalogPrice').value),
      sampleType: document.getElementById('catalogSampleType').value.trim(),
      specimenContainer: document.getElementById('catalogContainer').value.trim()
    };

    try {
      if (id) {
        // Edit Mode
        const res = await apiRequest(`/diagnostics/tests/${id}`, { method: 'PUT', body: payload });
        const updated = res.data;
        const idx = localTestCatalog.findIndex((t) => t.id === id);
        if (idx !== -1) localTestCatalog[idx] = updated;
      } else {
        // Create Mode
        const res = await apiRequest('/diagnostics/tests', { method: 'POST', body: payload });
        localTestCatalog.unshift(res.data);
      }

      renderTable(localTestCatalog);

      const modalEl = document.getElementById('testModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      document.getElementById('testForm').reset();
      document.getElementById('catalogId').value = '';
    } catch (err) {
      alert(err.message || 'Failed to save diagnostic test.');
    }
  });
});
