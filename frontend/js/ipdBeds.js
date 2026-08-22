document.addEventListener('DOMContentLoaded', async () => {
  const bedGridContainer = document.getElementById('bedGridContainer');
  const admitPatientSelect = document.getElementById('admitPatientSelect');
  const admitDoctorSelect = document.getElementById('admitDoctorSelect');
  const admitForm = document.getElementById('admitForm');
  const ipdAlert = document.getElementById('ipdAlert');

  let allBeds = [];

  function showAlert(msg, isErr = true) {
    ipdAlert.classList.remove('d-none', 'alert-danger', 'alert-success');
    ipdAlert.classList.add(isErr ? 'alert-danger' : 'alert-success');
    ipdAlert.textContent = msg;
  }

  // Load Selectors
  try {
    const patRes = await apiRequest('/patients');
    (patRes.data || patRes).forEach((p) => {
      const opt = `<option value="${p.id}">${p.fullName || p.name} (${p.uhid || p.id})</option>`;
      admitPatientSelect.insertAdjacentHTML('beforeend', opt);
    });

    const docRes = await apiRequest('/doctors');
    (docRes.data || docRes).forEach((d) => {
      const opt = `<option value="${d.id}">Dr. ${d.name} (${d.specialization || 'General'})</option>`;
      admitDoctorSelect.insertAdjacentHTML('beforeend', opt);
    });
  } catch (err) {
    console.error('Failed to load selectors:', err);
  }

  async function loadBedMatrix(filterWard = 'all') {
    try {
      const res = await apiRequest('/ipd/beds/matrix');
      const data = res.data || res;
      const summary = data.summary || {};
      allBeds = data.allBeds || [];

      document.getElementById('statBedAvailable').textContent = summary.available || 0;
      document.getElementById('statBedOccupied').textContent = summary.occupied || 0;
      document.getElementById('statBedCleaning').textContent = summary.cleaning || 0;
      document.getElementById('statBedTotal').textContent = summary.total || 0;

      let filtered = allBeds;
      if (filterWard !== 'all') {
        filtered = allBeds.filter((b) => (b.wardType || '').toLowerCase() === filterWard.toLowerCase());
      }

      if (filtered.length === 0) {
        bedGridContainer.innerHTML = '<div class="text-center text-muted py-4">No beds registered under this ward category.</div>';
        return;
      }

      bedGridContainer.innerHTML = '';
      filtered.forEach((bed) => {
        let statusClass = 'bed-available';
        let statusBadge = '<span class="badge bg-success">Available</span>';

        if (bed.status === 'occupied') { statusClass = 'bed-occupied'; statusBadge = '<span class="badge bg-danger">Occupied</span>'; }
        if (bed.status === 'cleaning') { statusClass = 'bed-cleaning'; statusBadge = '<span class="badge bg-warning text-dark">Cleaning</span>'; }
        if (bed.status === 'maintenance') { statusClass = 'bed-maintenance'; statusBadge = '<span class="badge bg-secondary">Maintenance</span>'; }

        const col = `
          <div class="col-md-3 col-sm-6">
            <div class="card shadow-sm border-0 bed-card ${statusClass}" data-id="${bed.id}">
              <div class="card-body py-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-hospital me-1"></i>${bed.bedNumber}</h6>
                  <div>
                    ${statusBadge}
                  </div>
                </div>
                <div class="small text-muted mb-1">${(bed.wardType || '').toUpperCase()} Ward | ${bed.floor || 'Floor'}</div>
                <div class="d-flex justify-content-between align-items-center mt-2 pt-1 border-top">
                  <span class="fw-bold text-primary small">${bed.dailyCharge || 1000} BDT/Day</span>
                  <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2 btn-open-status-modal" data-id="${bed.id}">
                    <i class="bi bi-gear me-1"></i>Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        bedGridContainer.insertAdjacentHTML('beforeend', col);
      });

      // Open Bed Status Modal helper
      function openBedStatusModal(bed) {
        if (!bed) return;
        document.getElementById('statusBedId').value = bed.id;
        document.getElementById('statusBedInfo').value = `${bed.bedNumber} (${(bed.wardType || '').toUpperCase()} Ward) — Daily Charge: ${bed.dailyCharge || 1000} BDT`;
        document.getElementById('statusBedSelect').value = bed.status || 'available';

        const btnAdmit = document.getElementById('btnActionAdmitFromStatusModal');
        if (btnAdmit) {
          btnAdmit.onclick = () => {
            const statusModalEl = document.getElementById('bedStatusModal');
            const statusModal = bootstrap.Modal.getInstance(statusModalEl) || bootstrap.Modal.getOrCreateInstance(statusModalEl);
            if (statusModal) statusModal.hide();

            document.getElementById('admitBedId').value = bed.id;
            document.getElementById('admitBedNumber').value = `${bed.bedNumber} (${(bed.wardType || '').toUpperCase()})`;
            const admitModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('admitModal'));
            admitModal.show();
          };
        }

        const statusModalEl = document.getElementById('bedStatusModal');
        const modal = bootstrap.Modal.getInstance(statusModalEl) || bootstrap.Modal.getOrCreateInstance(statusModalEl);
        modal.show();
      }

      // Bed Card & Status Button Click Events
      document.querySelectorAll('.btn-open-status-modal').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bedId = e.currentTarget.getAttribute('data-id');
          const bed = allBeds.find((b) => String(b.id) === String(bedId) || String(b._id) === String(bedId));
          openBedStatusModal(bed);
        });
      });

      document.querySelectorAll('.bed-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-open-status-modal')) return;
          const bedId = e.currentTarget.getAttribute('data-id');
          const bed = allBeds.find((b) => String(b.id) === String(bedId) || String(b._id) === String(bedId));
          openBedStatusModal(bed);
        });
      });
    } catch (err) {
      showAlert('Failed to load bed matrix: ' + err.message);
    }
  }

  // Ward Filter Buttons
  document.querySelectorAll('#wardFilterGroup button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#wardFilterGroup button').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      const ward = e.target.getAttribute('data-ward');
      loadBedMatrix(ward);
    });
  });

  // Bed Status Form Submit
  const bedStatusForm = document.getElementById('bedStatusForm');
  if (bedStatusForm) {
    bedStatusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bedId = document.getElementById('statusBedId').value;
      const status = document.getElementById('statusBedSelect').value;

      try {
        await apiRequest(`/ipd/beds/${bedId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });

        const modalEl = document.getElementById('bedStatusModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || bootstrap.Modal.getOrCreateInstance(modalEl);
        if (modal) modal.hide();

        showAlert(`Bed status updated to "${status.toUpperCase()}" successfully!`, false);
        loadBedMatrix();
      } catch (err) {
        showAlert('Failed to update bed status: ' + err.message);
      }
    });
  }

  // Admit Form Submit
  admitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bedId = document.getElementById('admitBedId').value;
    const patientId = admitPatientSelect.value;
    const attendingDoctorId = admitDoctorSelect.value;
    const admissionDeposit = document.getElementById('admitDeposit').value;
    const dailyCareNotes = document.getElementById('admitNotes').value;

    try {
      const res = await apiRequest('/ipd/admissions', {
        method: 'POST',
        body: JSON.stringify({ bedId, patientId, attendingDoctorId, admissionDeposit, dailyCareNotes })
      });
      const adm = res.data || res;
      showAlert(`Patient admitted under Admission #${adm.admissionNumber}!`, false);
      const modalEl = document.getElementById('admitModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      admitForm.reset();
      loadBedMatrix();
    } catch (err) {
      showAlert('Admission failed: ' + err.message);
    }
  });

  // Add New Bed Form Submit
  const addBedForm = document.getElementById('addBedForm');
  if (addBedForm) {
    addBedForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bedNumber = document.getElementById('newBedNumber').value.trim();
      const wardType = document.getElementById('newWardType').value;
      const dailyCharge = Number(document.getElementById('newDailyCharge').value) || 1000;
      const floor = document.getElementById('newFloor').value.trim();

      try {
        await apiRequest('/ipd/beds', {
          method: 'POST',
          body: { bedNumber, wardType, dailyCharge, floor, status: 'available' }
        });
        const modalEl = document.getElementById('addBedModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        addBedForm.reset();
        showAlert(`Bed ${bedNumber} created successfully!`, false);
        loadBedMatrix();
      } catch (err) {
        showAlert('Failed to create bed: ' + err.message);
      }
    });
  }

  await loadBedMatrix();
});
