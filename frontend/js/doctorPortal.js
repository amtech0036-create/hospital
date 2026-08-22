document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/doctor-portal.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Doctor Consultation Workstation';

  new SearchComponent('#doctorPortalSearchContainer', {
    endpoint: '/api/opd',
    placeholder: 'Search Consultation Queue by Patient UHID, Token, Name...',
    onSelect: (item) => {
      loadDoctorQueue(item.uhid);
    }
  });

  loadDoctorQueue();
  document.getElementById('btnRefreshDoctor').addEventListener('click', loadDoctorQueue);
});

async function loadDoctorQueue(searchQuery = '') {
  const tbody = document.getElementById('doctorQueueBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading OPD consultation queue...</td></tr>`;

    let url = `/api/opd?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const queue = res.data || [];

    if (!queue.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No patients waiting in doctor queue.</td></tr>`;
      return;
    }

    tbody.innerHTML = queue.map(item => `
      <tr>
        <td><span class="badge bg-primary p-2">#${item.tokenNumber || 'TK-01'}</span></td>
        <td>
          <div class="fw-bold text-dark">${item.patientName || item.patient?.fullName || 'Patient'}</div>
          <div class="small text-muted">UHID: ${item.uhid || item.patient?.uhid || 'N/A'}</div>
        </td>
        <td class="small text-muted">BP: 120/80 | Temp: 98.4°F</td>
        <td class="small fw-semibold">${item.doctorName || 'Dr. Consultant'}</td>
        <td><span class="badge bg-warning-subtle text-dark border border-warning">${item.status || 'Waiting'}</span></td>
        <td class="text-end">
          <a class="btn btn-sm btn-success me-1" href="/prescription.html?uhid=${item.uhid}">
            <i class="bi bi-file-earmark-medical me-1"></i> Write Prescription
          </a>
          <a class="btn btn-sm btn-outline-primary" href="/emr.html?uhid=${item.uhid}">
            <i class="bi bi-clock-history me-1"></i> EMR
          </a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Doctor queue error:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load consultation queue.</td></tr>`;
  }
}
