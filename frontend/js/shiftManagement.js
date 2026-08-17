/**
 * Shift Management Frontend Handler
 */
function initShiftManagement({ showError, showSuccess }) {
  const modalEl = document.getElementById('shiftModal');
  if (!modalEl) return null;

  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('shiftForm');
  let shifts = [];
  let editingId = null;

  async function loadShifts() {
    try {
      const res = await apiRequest('/shifts');
      shifts = res.data || [];
      renderShiftsTable();
      populateShiftDropdowns();
    } catch (err) {
      if (showError) showError(err);
    }
  }

  function renderShiftsTable() {
    const body = document.getElementById('shiftTableBody');
    if (!body) return;

    if (!shifts.length) {
      body.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No work shifts created yet.</td></tr>';
      return;
    }

    body.innerHTML = shifts
      .map((s) => `
      <tr>
        <td class="fw-bold">${s.shiftName}</td>
        <td><code>${s.startTime} – ${s.endTime}</code></td>
        <td>${s.breakTimeMinutes || 60} mins</td>
        <td>${s.standardHours || 8} hrs</td>
        <td><span class="badge bg-light text-dark border">${s.gracePeriodMinutes || 15} mins</span></td>
        <td>${s.overtimePolicy || 'Standard'}</td>
        <td><span class="badge ${s.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${s.status || 'Active'}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-1" data-edit-shift="${s.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-delete-shift="${s.id}">Delete</button>
        </td>
      </tr>`)
      .join('');

    body.querySelectorAll('[data-edit-shift]').forEach((btn) => btn.addEventListener('click', () => openEditShift(btn.dataset.editShift)));
    body.querySelectorAll('[data-delete-shift]').forEach((btn) => btn.addEventListener('click', () => deleteShift(btn.dataset.deleteShift)));
  }

  function populateShiftDropdowns() {
    const opts = '<option value="">Morning Shift (08:00–17:00)</option>' +
      shifts.map((s) => `<option value="${s.id}">${s.shiftName} (${s.startTime}–${s.endTime})</option>`).join('');

    const empShiftSelect = document.getElementById('e_shiftId');
    if (empShiftSelect) {
      empShiftSelect.innerHTML = opts;
    }
  }

  document.getElementById('addShiftBtn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('shift_startTime').value = '08:00';
    document.getElementById('shift_endTime').value = '17:00';
    document.getElementById('shift_standardHours').value = '8';
    document.getElementById('shift_gracePeriod').value = '15';
    document.getElementById('shift_breakTime').value = '60';
    document.getElementById('shiftModalTitle').textContent = 'Create Work Shift';
    modal.show();
  });

  function openEditShift(id) {
    const s = shifts.find((x) => x.id === id);
    if (!s) return;
    editingId = id;
    document.getElementById('shiftModalTitle').textContent = `Edit Shift: ${s.shiftName}`;
    document.getElementById('shift_name').value = s.shiftName;
    document.getElementById('shift_startTime').value = s.startTime;
    document.getElementById('shift_endTime').value = s.endTime;
    document.getElementById('shift_standardHours').value = s.standardHours || 8;
    document.getElementById('shift_gracePeriod').value = s.gracePeriodMinutes || 15;
    document.getElementById('shift_breakTime').value = s.breakTimeMinutes || 60;
    document.getElementById('shift_otPolicy').value = s.overtimePolicy || 'Standard';
    modal.show();
  }

  async function deleteShift(id) {
    if (!confirm('Delete this shift?')) return;
    try {
      await apiRequest(`/shifts/${id}`, { method: 'DELETE' });
      if (showSuccess) showSuccess('Shift deleted.');
      loadShifts();
    } catch (err) {
      if (showError) showError(err);
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      shiftName: document.getElementById('shift_name').value.trim(),
      startTime: document.getElementById('shift_startTime').value,
      endTime: document.getElementById('shift_endTime').value,
      standardHours: parseFloat(document.getElementById('shift_standardHours').value) || 8,
      gracePeriodMinutes: parseInt(document.getElementById('shift_gracePeriod').value, 10) || 15,
      breakTimeMinutes: parseInt(document.getElementById('shift_breakTime').value, 10) || 60,
      overtimePolicy: document.getElementById('shift_otPolicy').value
    };

    try {
      if (editingId) {
        await apiRequest(`/shifts/${editingId}`, { method: 'PUT', body: payload });
        if (showSuccess) showSuccess('Shift updated successfully.');
      } else {
        await apiRequest('/shifts', { method: 'POST', body: payload });
        if (showSuccess) showSuccess('New work shift created successfully.');
      }
      modal.hide();
      loadShifts();
    } catch (err) {
      if (showError) showError(err);
    }
  });

  return {
    loadShifts,
    getShifts: () => shifts
  };
}
