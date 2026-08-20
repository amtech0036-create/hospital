document.addEventListener('DOMContentLoaded', async () => {
  const emrSearchUhid = document.getElementById('emrSearchUhid');
  const emrSearchBtn = document.getElementById('emrSearchBtn');
  const patientProfileCard = document.getElementById('patientProfileCard');
  const emrTimelineContainer = document.getElementById('emrTimelineContainer');
  const emrAlert = document.getElementById('emrAlert');

  function showAlert(msg, isErr = true) {
    emrAlert.classList.remove('d-none', 'alert-danger', 'alert-success');
    emrAlert.classList.add(isErr ? 'alert-danger' : 'alert-success');
    emrAlert.textContent = msg;
  }

  async function loadEmrTimeline(uhid) {
    if (!uhid) return;
    try {
      const res = await apiRequest(`/emr/patients/${uhid}/emr-timeline`);
      const data = res.data || res;
      const patient = data.patient;
      const timeline = data.timeline || [];

      // Update Patient Profile Card
      document.getElementById('emrPatientName').textContent = patient.fullName || patient.name;
      document.getElementById('emrUhidText').textContent = patient.uhid || patient.id;
      document.getElementById('emrAgeText').textContent = `${patient.gender || 'N/A'} / ${typeof patient.age === 'object' ? `${patient.age.value} ${patient.age.unit}` : patient.age || 'N/A'}`;
      document.getElementById('emrPhoneText').textContent = patient.phone || 'N/A';
      document.getElementById('emrBloodGroupText').textContent = patient.bloodGroup || 'N/A';
      patientProfileCard.classList.remove('d-none');

      if (timeline.length === 0) {
        emrTimelineContainer.innerHTML = '<div class="text-center text-muted py-4">No clinical events recorded for this patient yet.</div>';
        return;
      }

      emrTimelineContainer.innerHTML = '';
      timeline.forEach((event) => {
        let iconClass = 'bi-record-fill';
        let badgeClass = 'bg-primary';

        if (event.recordType === 'PRESCRIPTION') { iconClass = 'bi-capsule'; badgeClass = 'bg-success'; }
        if (event.recordType === 'LIS_REPORT') { iconClass = 'bi-file-earmark-medical'; badgeClass = 'bg-info text-dark'; }
        if (event.recordType === 'RIS_REPORT') { iconClass = 'bi-camera-reels'; badgeClass = 'bg-purple text-dark'; }
        if (event.recordType === 'IPD') { iconClass = 'bi-hospital'; badgeClass = 'bg-danger'; }

        const dateStr = event.recordedAt ? new Date(event.recordedAt).toLocaleString() : 'N/A';

        const itemHtml = `
          <div class="timeline-item">
            <div class="timeline-icon"><i class="bi ${iconClass}"></i></div>
            <div class="card shadow-sm border-0">
              <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="badge ${badgeClass}">${event.recordType}</span>
                  <small class="text-muted"><i class="bi bi-clock me-1"></i>${dateStr}</small>
                </div>
                <h6 class="fw-bold mb-1">${event.title}</h6>
                <p class="small text-muted mb-0">${event.summary || 'No detailed summary'}</p>
                ${event.doctorName ? `<small class="text-primary mt-1 d-block"><i class="bi bi-person-badge me-1"></i>Attending: ${event.doctorName}</small>` : ''}
              </div>
            </div>
          </div>
        `;
        emrTimelineContainer.insertAdjacentHTML('beforeend', itemHtml);
      });
    } catch (err) {
      showAlert('Failed to load EMR timeline: ' + err.message);
    }
  }

  emrSearchBtn.addEventListener('click', () => loadEmrTimeline(emrSearchUhid.value.trim()));

  // Check URL query param e.g. emr.html?uhid=UHID-TNT-000001-...
  const urlParams = new URLSearchParams(window.location.search);
  const qUhid = urlParams.get('uhid');
  if (qUhid) {
    emrSearchUhid.value = qUhid;
    loadEmrTimeline(qUhid);
  }
});
