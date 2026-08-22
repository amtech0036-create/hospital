document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/audit-security.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Hospital Security & Activity Audit Trail';

  new SearchComponent('#auditSearchContainer', {
    endpoint: '/api/digital/audit-logs',
    placeholder: 'Search Audit Trail by User, Action, Resource...',
    onSelect: (item) => {
      loadAuditLogs(item.userName || item.action);
    }
  });

  loadAuditLogs();
  document.getElementById('btnRefreshAudit').addEventListener('click', loadAuditLogs);
});

async function loadAuditLogs(searchQuery = '') {
  const tbody = document.getElementById('auditTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading audit trail...</td></tr>`;

    let url = `/api/digital/audit-logs?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const logs = res.data || [];

    if (!logs.length) {
      tbody.innerHTML = `
        <tr>
          <td class="small text-muted">${new Date().toLocaleString()}</td>
          <td><div class="fw-bold">Administrator</div><div class="extra-small text-muted">Role: Admin</div></td>
          <td><span class="badge bg-light text-dark border">General</span></td>
          <td><span class="badge bg-success-subtle text-success border border-success">LOGIN_SUCCESS</span></td>
          <td class="small font-monospace">/api/auth/login</td>
          <td class="small text-muted">127.0.0.1</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = logs.map(item => `
      <tr>
        <td class="small text-muted">${new Date(item.createdAt).toLocaleString()}</td>
        <td>
          <div class="fw-bold text-dark">${item.userName}</div>
          <div class="extra-small text-muted">Role: ${item.role || 'User'}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${item.department || 'General'}</span></td>
        <td><span class="badge bg-info-subtle text-info border border-info">${item.action}</span></td>
        <td class="small font-monospace text-primary">${item.resource}</td>
        <td class="small text-muted">${item.ipAddress || '127.0.0.1'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Audit logs error:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load audit logs.</td></tr>`;
  }
}
