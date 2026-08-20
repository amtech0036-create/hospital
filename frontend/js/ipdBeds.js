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
            <div class="card shadow-sm border-0 bed-card ${statusClass}" data-id="${bed.id}" data-bed='${JSON.stringify(bed)}'>
              <div class="card-body py-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-hospital me-1"></i>${bed.bedNumber}</h6>
                  ${statusBadge}
                </div>
                <div class="small text-muted mb-1">${(bed.wardType || '').toUpperCase()} Ward | ${bed.floor || 'Floor'}</div>
                <div class="fw-bold text-primary small">${bed.dailyCharge || 1000} BDT / Day</div>
              </div>
            </div>
          </div>
        `;
        bedGridContainer.insertAdjacentHTML('beforeend', col);
      });

      // Bed Card Click Event
      document.querySelectorAll('.bed-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          const bed = JSON.parse(e.currentTarget.getAttribute('data-bed'));
          if (bed.status === 'available') {
            document.getElementById('admitBedId').value = bed.id;
            document.getElementById('admitBedNumber').value = `${bed.bedNumber} (${bed.wardType.toUpperCase()})`;
            const modal = new bootstrap.Modal(document.getElementById('admitModal'));
            modal.show();
          } else {
            showAlert(`Bed ${bed.bedNumber} is currently ${bed.status}.`);
          }
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

  await loadBedMatrix();
});
