document.addEventListener('DOMContentLoaded', async () => {
  const doctorSelect = document.getElementById('doctorSelect');
  const modalDoctorSelect = document.getElementById('modalDoctorSelect');
  const modalPatientSelect = document.getElementById('modalPatientSelect');
  const modalDoctorFee = document.getElementById('modalDoctorFee');
  const opdQueueTableBody = document.getElementById('opdQueueTableBody');
  const refreshQueueBtn = document.getElementById('refreshQueueBtn');
  const tokenForm = document.getElementById('tokenForm');
  const vitalsForm = document.getElementById('vitalsForm');
  const opdAlert = document.getElementById('opdAlert');

  let doctorsMap = {};
  let patientsMap = {};

  function showAlert(msg, isErr = true) {
    opdAlert.classList.remove('d-none', 'alert-danger', 'alert-success');
    opdAlert.classList.add(isErr ? 'alert-danger' : 'alert-success');
    opdAlert.textContent = msg;
  }

  // Load Doctors & Patients
  async function loadInitialData() {
    try {
      const docsRes = await apiRequest('/doctors');
      const docs = docsRes.data || docsRes;
      const schedDoctorSelect = document.getElementById('schedDoctorSelect');
      doctorSelect.innerHTML = '<option value="">-- Select Doctor --</option>';
      modalDoctorSelect.innerHTML = '<option value="">-- Select Doctor --</option>';
      if (schedDoctorSelect) schedDoctorSelect.innerHTML = '<option value="">-- Select Doctor --</option>';

      docs.forEach((doc) => {
        doctorsMap[doc.id] = doc;
        const opt = `<option value="${doc.id}">Dr. ${doc.name} (${doc.specialization || doc.department || 'General'}) - Fee: ${doc.fee || 500} BDT</option>`;
        doctorSelect.insertAdjacentHTML('beforeend', opt);
        modalDoctorSelect.insertAdjacentHTML('beforeend', opt);
        if (schedDoctorSelect) schedDoctorSelect.insertAdjacentHTML('beforeend', opt);
      });

      const patRes = await apiRequest('/patients');
      const pats = patRes.data || patRes;
      modalPatientSelect.innerHTML = '<option value="">-- Select Patient --</option>';

      pats.forEach((p) => {
        patientsMap[p.id] = p;
        const opt = `<option value="${p.id}">${p.fullName || p.name} (${p.uhid || p.id}) - Mobile: ${p.phone || 'N/A'}</option>`;
        modalPatientSelect.insertAdjacentHTML('beforeend', opt);
      });
    } catch (err) {
      console.error('Failed to load initial OPD data:', err);
    }
  }

  // Fetch Doctor Queue
  async function loadQueue() {
    const doctorId = doctorSelect.value;
    if (!doctorId) {
      opdQueueTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Select a doctor to view live waiting queue.</td></tr>';
      document.getElementById('statTotal').textContent = '0';
      document.getElementById('statWaiting').textContent = '0';
      document.getElementById('statCompleted').textContent = '0';
      return;
    }

    try {
      const res = await apiRequest(`/opd/queue/${doctorId}`);
      const queueData = res.data || res;
      const appointments = queueData.queue || [];

      document.getElementById('statTotal').textContent = appointments.length;
      document.getElementById('statWaiting').textContent = appointments.filter((a) => a.status === 'scheduled' || a.status === 'in_queue' || a.status === 'in_consultation').length;
      document.getElementById('statCompleted').textContent = appointments.filter((a) => a.status === 'completed').length;

      if (appointments.length === 0) {
        opdQueueTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No appointments booked for this doctor today.</td></tr>';
        return;
      }

      opdQueueTableBody.innerHTML = '';
      appointments.forEach((apt) => {
        const vitals = apt.vitals || {};
        const vitalsText = vitals.bp ? `BP: ${vitals.bp}, Pulse: ${vitals.pulse || 'N/A'}` : '<span class="text-muted small">No Vitals Captured</span>';

        let statusBadge = '<span class="badge bg-secondary">Scheduled</span>';
        if (apt.status === 'in_queue') statusBadge = '<span class="badge bg-warning text-dark">In Waiting Queue</span>';
        if (apt.status === 'in_consultation') statusBadge = '<span class="badge bg-info text-dark">In Consultation</span>';
        if (apt.status === 'completed') statusBadge = '<span class="badge bg-success">Completed</span>';
        if (apt.status === 'cancelled') statusBadge = '<span class="badge bg-danger">Cancelled</span>';

        const row = `
          <tr>
            <td class="ps-3"><span class="badge bg-dark fs-6">#${apt.tokenNumber}</span></td>
            <td><small class="fw-bold text-primary">${apt.appointmentNumber}</small></td>
            <td>
              <div class="fw-bold">${apt.patientName}</div>
              <small class="text-muted">UHID: ${apt.uhid} | Phone: ${apt.patientPhone || 'N/A'}</small>
            </td>
            <td><small>${vitalsText}</small></td>
            <td class="fw-bold">${apt.consultationFee || 500} BDT</td>
            <td>${statusBadge}</td>
            <td class="text-end pe-3">
              <button class="btn btn-sm btn-outline-danger me-1 capture-vitals-btn" data-id="${apt.id}" data-vitals='${JSON.stringify(vitals)}'>
                <i class="bi bi-heart-pulse"></i> Vitals
              </button>
              <select class="form-select form-select-sm d-inline-block w-auto change-status-select" data-id="${apt.id}">
                <option value="">Status...</option>
                <option value="in_queue" ${apt.status === 'in_queue' ? 'selected' : ''}>In Queue</option>
                <option value="in_consultation" ${apt.status === 'in_consultation' ? 'selected' : ''}>In Consultation</option>
                <option value="completed" ${apt.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${apt.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
          </tr>
        `;
        opdQueueTableBody.insertAdjacentHTML('beforeend', row);
      });

      // Attach Event Listeners for Vitals & Status
      document.querySelectorAll('.capture-vitals-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const vitals = JSON.parse(e.currentTarget.getAttribute('data-vitals') || '{}');
          document.getElementById('vitalsAppointmentId').value = id;
          document.getElementById('vitalsBp').value = vitals.bp || '';
          document.getElementById('vitalsPulse').value = vitals.pulse || '';
          document.getElementById('vitalsTemp').value = vitals.temperature || '';
          document.getElementById('vitalsSpo2').value = vitals.spo2 || '';
          document.getElementById('vitalsWeight').value = vitals.weight || '';
          const modal = new bootstrap.Modal(document.getElementById('vitalsModal'));
          modal.show();
        });
      });

      document.querySelectorAll('.change-status-select').forEach((sel) => {
        sel.addEventListener('change', async (e) => {
          const id = e.target.getAttribute('data-id');
          const status = e.target.value;
          if (!status) return;
          try {
            await apiRequest(`/opd/appointments/${id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status })
            });
            loadQueue();
          } catch (err) {
            showAlert('Failed to update status: ' + err.message);
          }
        });
      });
    } catch (err) {
      showAlert('Failed to load queue: ' + err.message);
    }
  }

  // Modal Doctor Select Fee Sync
  modalDoctorSelect.addEventListener('change', () => {
    const docId = modalDoctorSelect.value;
    const doc = doctorsMap[docId];
    modalDoctorFee.value = doc ? (doc.fee || 500) : 500;
  });

  // Issue Token Form
  tokenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const doctorId = modalDoctorSelect.value;
    const patientId = modalPatientSelect.value;
    const notes = document.getElementById('modalNotes').value;

    if (!doctorId || !patientId) {
      showAlert('Please select both a Doctor and a Patient before issuing a token.');
      return;
    }

    try {
      await apiRequest('/opd/appointments', {
        method: 'POST',
        body: JSON.stringify({ doctorId, patientId, notes })
      });
      const modalEl = document.getElementById('tokenModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      tokenForm.reset();
      if (doctorSelect.value === doctorId) loadQueue();
      else {
        doctorSelect.value = doctorId;
        loadQueue();
      }
    } catch (err) {
      showAlert('Failed to issue token: ' + err.message);
    }
  });

  // Vitals Form
  vitalsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('vitalsAppointmentId').value;
    const vitals = {
      bp: document.getElementById('vitalsBp').value,
      pulse: document.getElementById('vitalsPulse').value,
      temperature: document.getElementById('vitalsTemp').value,
      spo2: document.getElementById('vitalsSpo2').value,
      weight: document.getElementById('vitalsWeight').value
    };

    try {
      await apiRequest(`/opd/appointments/${id}/vitals`, {
        method: 'PATCH',
        body: JSON.stringify(vitals)
      });
      const modalEl = document.getElementById('vitalsModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      loadQueue();
    } catch (err) {
      showAlert('Failed to save vitals: ' + err.message);
    }
  });

  // Open Add Doctor Schedule Modal
  window.openScheduleModal = async function () {
    try {
      const res = await apiRequest('/doctors');
      const docs = res.data || res;
      const select = document.getElementById('scheduleDoctorSelect');
      if (select) {
        select.innerHTML = '<option value="">-- Select Doctor --</option>';
        docs.forEach((d) => {
          select.insertAdjacentHTML('beforeend', `<option value="${d.id}">Dr. ${d.name} (${d.specialization || d.department || 'General'}) - Fee: ${d.fee || 800} BDT</option>`);
        });
      }
      const modalEl = document.getElementById('addScheduleModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    } catch (err) {
      showAlert('Failed to load doctors: ' + err.message);
    }
  };

  // Add Doctor Schedule Form
  const scheduleForm = document.getElementById('scheduleForm');
  if (scheduleForm) {
    scheduleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const doctorId = document.getElementById('scheduleDoctorSelect').value;
      const doc = doctorsMap[doctorId];
      const payload = {
        doctorId,
        doctorName: doc ? doc.name : '',
        dayOfWeek: document.getElementById('schedDay').value,
        startTime: document.getElementById('schedStartTime').value,
        endTime: document.getElementById('schedEndTime').value,
        slotDurationMinutes: Number(document.getElementById('schedDuration').value) || 15,
        maxTokens: Number(document.getElementById('schedMaxTokens').value) || 30,
        consultationFee: Number(document.getElementById('schedFee').value) || 800
      };

      try {
        await apiRequest('/opd/schedules', {
          method: 'POST',
          body: payload
        });
        const modalEl = document.getElementById('addScheduleModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        scheduleForm.reset();
        showAlert('Doctor Schedule added successfully!', false);
      } catch (err) {
        showAlert('Failed to add schedule: ' + err.message);
      }
    });
  }

  doctorSelect.addEventListener('change', loadQueue);
  refreshQueueBtn.addEventListener('click', loadQueue);

  await loadInitialData();
});
