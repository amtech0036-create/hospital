/**
 * Super Admin Dashboard Script
 * Manages tenant accounts, subdomains, license tiers, and status.
 */
document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/super-admin.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Super Admin Portal';

  let allTenants = [];

  const superAdminAlert = document.getElementById('superAdminAlert');
  const superAdminSuccess = document.getElementById('superAdminSuccess');
  const tenantsTableBody = document.getElementById('tenantsTableBody');
  const searchInput = document.getElementById('searchTenants');
  const refreshBtn = document.getElementById('refreshBtn');

  function showAlert(msg) {
    if (!superAdminAlert) return;
    superAdminAlert.textContent = msg;
    superAdminAlert.classList.remove('d-none');
    superAdminSuccess?.classList.add('d-none');
  }

  function showSuccess(msg) {
    if (!superAdminSuccess) return;
    superAdminSuccess.textContent = msg;
    superAdminSuccess.classList.remove('d-none');
    superAdminAlert?.classList.add('d-none');
    setTimeout(() => superAdminSuccess.classList.add('d-none'), 5000);
  }

  function hideAlerts() {
    superAdminAlert?.classList.add('d-none');
    superAdminSuccess?.classList.add('d-none');
  }

  const TIER_NAMES = {
    1: 'Tier 1 (Starter - Max 15)',
    2: 'Tier 2 (Growth - Max 50)',
    3: 'Tier 3 (Pro - Max 100)',
    4: 'Tier 4 (Enterprise - Max 500)'
  };

  async function loadTenants() {
    hideAlerts();
    tenantsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Loading business tenants...</td></tr>`;

    try {
      const res = await apiRequest('/super-admin/tenants');
      allTenants = res.data || [];
      updateKPIs(allTenants);
      renderTenantsTable(allTenants);
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Failed to load business tenants.');
      tenantsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-2"></i>Failed to load tenants. (${err.message})</td></tr>`;
    }
  }

  function updateKPIs(tenants) {
    const total = tenants.length;
    const active = tenants.filter(t => t.isActive !== false).length;
    const suspended = total - active;
    const totalUsers = tenants.reduce((acc, t) => acc + (t.activeUserCount || 0), 0);

    document.getElementById('statTotalTenants').textContent = total;
    document.getElementById('statActiveTenants').textContent = active;
    document.getElementById('statSuspendedTenants').textContent = suspended;
    document.getElementById('statTotalUsers').textContent = totalUsers;
  }

  function renderTenantsTable(tenants) {
    const query = (searchInput.value || '').toLowerCase().trim();
    const filtered = tenants.filter(t => 
      (t.name || '').toLowerCase().includes(query) ||
      (t.subdomain || '').toLowerCase().includes(query) ||
      (t.id || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      tenantsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No business tenants found.</td></tr>`;
      return;
    }

    tenantsTableBody.innerHTML = filtered.map(t => {
      const isAct = t.isActive !== false;
      const tierBadgeClass = `tier-badge-${t.licenseTier || 1}`;
      const tierName = TIER_NAMES[t.licenseTier || 1] || `Tier ${t.licenseTier}`;
      const activeCount = t.activeUserCount || 0;
      const maxLimit = t.maxUsers || 15;
      const usagePct = Math.min(100, Math.round((activeCount / maxLimit) * 100));

      const expiryStr = t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : 'N/A';

      return `
        <tr>
          <td>
            <div class="fw-bold text-dark">${t.name}</div>
            <small class="text-muted">ID: ${t.id}</small>
          </td>
          <td>
            <span class="badge bg-light text-dark border font-monospace"><i class="bi bi-globe me-1"></i>${t.subdomain}</span>
          </td>
          <td>
            <span class="badge ${tierBadgeClass} px-2 py-1">${tierName}</span>
          </td>
          <td style="min-width: 140px;">
            <div class="d-flex align-items-center justify-content-between small mb-1">
              <span>${activeCount} / ${maxLimit} users</span>
              <span class="fw-bold">${usagePct}%</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar ${usagePct >= 90 ? 'bg-danger' : usagePct >= 75 ? 'bg-warning' : 'bg-primary'}" role="progressbar" style="width: ${usagePct}%"></div>
            </div>
          </td>
          <td>
            <span class="small ${new Date(t.expiresAt).getTime() < Date.now() ? 'text-danger fw-bold' : ''}">
              <i class="bi bi-calendar-event me-1"></i>${expiryStr}
            </span>
          </td>
          <td>
            <span class="badge ${isAct ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} px-2 py-1">
              <i class="bi ${isAct ? 'bi-check-circle-fill' : 'bi-slash-circle-fill'} me-1"></i>${isAct ? 'Active' : 'Suspended'}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1 edit-license-btn" data-id="${t.id}" title="Edit License">
              <i class="bi bi-key me-1"></i>License
            </button>
            <button class="btn btn-sm ${isAct ? 'btn-outline-danger' : 'btn-outline-success'} toggle-status-btn" data-id="${t.id}" data-active="${isAct}">
              <i class="bi ${isAct ? 'bi-pause-circle' : 'bi-play-circle'} me-1"></i>${isAct ? 'Suspend' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    attachTableEventHandlers();
  }

  function attachTableEventHandlers() {
    document.querySelectorAll('.edit-license-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const tenant = allTenants.find(t => t.id === id);
        if (!tenant) return;

        document.getElementById('editTenantId').value = tenant.id;
        document.getElementById('editTenantSubdomain').value = tenant.subdomain;
        document.getElementById('editLicenseTier').value = tenant.licenseTier || 1;
        document.getElementById('editExpiresAt').value = tenant.expiresAt ? tenant.expiresAt.substring(0, 10) : '';
        document.getElementById('editLicenseKeyInput').value = '';

        const modal = new bootstrap.Modal(document.getElementById('editLicenseModal'));
        modal.show();
      });
    });

    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const currentActive = btn.getAttribute('data-active') === 'true';
        const newActive = !currentActive;

        if (!confirm(`Are you sure you want to ${newActive ? 'ACTIVATE' : 'SUSPEND'} this business tenant?`)) return;

        try {
          await apiRequest(`/super-admin/tenants/${id}/status`, {
            method: 'PUT',
            body: { isActive: newActive }
          });
          showSuccess(`Tenant status updated successfully.`);
          loadTenants();
        } catch (err) {
          showAlert(err.message || 'Failed to update tenant status.');
        }
      });
    });
  }

  // Provision Form Submit
  const provisionForm = document.getElementById('provisionForm');
  provisionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('provisionName').value.trim();
    const subdomain = document.getElementById('provisionSubdomain').value.trim();
    const licenseTier = parseInt(document.getElementById('provisionTier').value, 10);
    const expiresAtRaw = document.getElementById('provisionExpiresAt').value;

    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : undefined;

    const submitBtn = document.getElementById('provisionSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Provisioning...`;

    try {
      await apiRequest('/super-admin/tenants', {
        method: 'POST',
        body: { name, subdomain, licenseTier, expiresAt }
      });
      showSuccess(`Tenant "${name}" (${subdomain}) provisioned successfully!`);

      const modalEl = document.getElementById('provisionModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal?.hide();
      provisionForm.reset();

      loadTenants();
    } catch (err) {
      alert(err.message || 'Failed to provision tenant.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Provision Tenant`;
    }
  });

  // Edit License Form Submit
  const editLicenseForm = document.getElementById('editLicenseForm');
  editLicenseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editTenantId').value;
    const licenseTier = parseInt(document.getElementById('editLicenseTier').value, 10);
    const expiresAtRaw = document.getElementById('editExpiresAt').value;
    const licenseKey = document.getElementById('editLicenseKeyInput').value.trim();

    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : undefined;

    try {
      await apiRequest(`/super-admin/tenants/${id}/license`, {
        method: 'PUT',
        body: licenseKey ? { licenseKey } : { licenseTier, expiresAt }
      });
      showSuccess(`License updated successfully.`);

      const modalEl = document.getElementById('editLicenseModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal?.hide();

      loadTenants();
    } catch (err) {
      alert(err.message || 'Failed to update tenant license.');
    }
  });

  // Standalone License Key Generator Form Submit
  const licenseGeneratorForm = document.getElementById('licenseGeneratorForm');
  licenseGeneratorForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subdomain = document.getElementById('genSubdomain').value.trim();
    const licenseTier = parseInt(document.getElementById('genTier').value, 10);
    const validDays = parseInt(document.getElementById('genValidDays').value, 10);

    try {
      const res = await apiRequest('/super-admin/licenses/generate', {
        method: 'POST',
        body: { subdomain, licenseTier, validDays }
      });

      const keyResult = res.data?.licenseKey || '';
      document.getElementById('genKeyResult').value = keyResult;
      document.getElementById('genResultContainer').classList.remove('d-none');
    } catch (err) {
      alert(err.message || 'Failed to generate license key.');
    }
  });

  // Copy Key Button
  document.getElementById('copyKeyBtn')?.addEventListener('click', () => {
    const keyInput = document.getElementById('genKeyResult');
    if (!keyInput.value) return;
    keyInput.select();
    navigator.clipboard.writeText(keyInput.value);
    alert('License key copied to clipboard!');
  });

  // Search input filter listener
  searchInput?.addEventListener('input', () => renderTenantsTable(allTenants));
  refreshBtn?.addEventListener('click', loadTenants);

  // Initial Load
  loadTenants();
});
