/**
 * Biometric Attendance Devices Management Frontend Handler
 */
function initBiometricDevices({ showError, showSuccess }) {
  const modalEl = document.getElementById('deviceModal');
  if (!modalEl) return null;

  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('deviceForm');
  let devices = [];
  let editingId = null;

  async function loadDevices() {
    try {
      const res = await apiRequest('/devices');
      devices = res.data || [];
      renderDevicesTable();
    } catch (err) {
      if (showError) showError(err);
    }
  }

  function renderDevicesTable() {
    const body = document.getElementById('deviceTableBody');
    if (!body) return;

    if (!devices.length) {
      body.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No attendance devices registered yet.</td></tr>';
      return;
    }

    body.innerHTML = devices
      .map((d) => {
        let badge = 'bg-success';
        if (d.status === 'Offline') badge = 'bg-danger';
        if (d.status === 'Disabled') badge = 'bg-secondary';

        return `
      <tr>
        <td class="fw-bold">${d.deviceName}</td>
        <td><span class="badge bg-light text-dark border">${d.deviceBrand}</span> <span class="small text-muted">(${d.deviceType})</span></td>
        <td><code>${d.ipAddress || '127.0.0.1'}:${d.port || 4370}</code></td>
        <td><small class="text-muted">${d.serialNumber || '—'}</small></td>
        <td>${d.location || '—'}</td>
        <td>${d.departmentName || 'All'}</td>
        <td><span class="badge ${badge}">${d.status}</span></td>
        <td><small>${d.lastSyncTime ? new Date(d.lastSyncTime).toLocaleString() : 'Never'}</small></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-info me-1" data-test-dev="${d.id}">Test Ping</button>
          <button class="btn btn-sm btn-outline-success me-1" data-sync-dev="${d.id}">Sync Logs</button>
          <button class="btn btn-sm btn-outline-primary me-1" data-edit-dev="${d.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-delete-dev="${d.id}">Delete</button>
        </td>
      </tr>`;
      })
      .join('');

    body.querySelectorAll('[data-test-dev]').forEach((btn) => btn.addEventListener('click', () => testConnection(btn.dataset.testDev)));
    body.querySelectorAll('[data-sync-dev]').forEach((btn) => btn.addEventListener('click', () => syncDeviceLogs(btn.dataset.syncDev)));
    body.querySelectorAll('[data-edit-dev]').forEach((btn) => btn.addEventListener('click', () => openEditDevice(btn.dataset.editDev)));
    body.querySelectorAll('[data-delete-dev]').forEach((btn) => btn.addEventListener('click', () => deleteDevice(btn.dataset.deleteDev)));
  }

  document.getElementById('addDeviceBtn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('dev_port').value = '4370';
    document.getElementById('deviceModalTitle').textContent = 'Register Attendance Device';
    modal.show();
  });

  function openEditDevice(id) {
    const d = devices.find((x) => x.id === id);
    if (!d) return;
    editingId = id;
    document.getElementById('deviceModalTitle').textContent = `Edit Device: ${d.deviceName}`;
    document.getElementById('dev_name').value = d.deviceName;
    document.getElementById('dev_type').value = d.deviceType;
    document.getElementById('dev_brand').value = d.deviceBrand;
    document.getElementById('dev_ip').value = d.ipAddress || '';
    document.getElementById('dev_port').value = d.port || 4370;
    document.getElementById('dev_serial').value = d.serialNumber || '';
    document.getElementById('dev_location').value = d.location || '';
    document.getElementById('dev_department').value = d.departmentId || '';
    modal.show();
  }

  async function testConnection(id) {
    try {
      const res = await apiRequest(`/devices/${id}/test-connection`, { method: 'POST' });
      if (res.data.success) {
        if (showSuccess) showSuccess(res.data.message);
      } else {
        if (showError) showError(new Error(res.data.message));
      }
      loadDevices();
    } catch (err) {
      if (showError) showError(err);
    }
  }

  async function syncDeviceLogs(id) {
    try {
      const res = await apiRequest(`/devices/${id}/sync-logs`, { method: 'POST' });
      if (showSuccess) showSuccess(`Logs synced from ${res.data.deviceName}: ${res.data.processedLogs} attendance record(s) processed.`);
      loadDevices();
    } catch (err) {
      if (showError) showError(err);
    }
  }

  document.getElementById('syncAllDevicesBtn')?.addEventListener('click', async () => {
    try {
      const res = await apiRequest('/devices/sync-all', { method: 'POST' });
      if (showSuccess) showSuccess(`Bulk Device Sync Completed: ${res.data.totalDevicesSynced} device(s) processed.`);
      loadDevices();
    } catch (err) {
      if (showError) showError(err);
    }
  });

  async function deleteDevice(id) {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      await apiRequest(`/devices/${id}`, { method: 'DELETE' });
      if (showSuccess) showSuccess('Device deleted successfully.');
      loadDevices();
    } catch (err) {
      if (showError) showError(err);
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      deviceName: document.getElementById('dev_name').value.trim(),
      deviceType: document.getElementById('dev_type').value,
      deviceBrand: document.getElementById('dev_brand').value,
      ipAddress: document.getElementById('dev_ip').value.trim(),
      port: parseInt(document.getElementById('dev_port').value, 10) || 4370,
      serialNumber: document.getElementById('dev_serial').value.trim(),
      location: document.getElementById('dev_location').value.trim(),
      departmentId: document.getElementById('dev_department').value
    };

    try {
      if (editingId) {
        await apiRequest(`/devices/${editingId}`, { method: 'PUT', body: payload });
        if (showSuccess) showSuccess('Device details updated.');
      } else {
        await apiRequest('/devices', { method: 'POST', body: payload });
        if (showSuccess) showSuccess('Attendance device registered successfully.');
      }
      modal.hide();
      loadDevices();
    } catch (err) {
      if (showError) showError(err);
    }
  });

  return {
    loadDevices
  };
}
