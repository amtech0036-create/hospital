document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/emr.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Centralized 360° EMR Timeline';

  new SearchComponent('#emrPatientSearchContainer', {
    endpoint: '/api/patients',
    placeholder: 'Search EMR by UHID, Patient Name, Phone...',
    onSelect: (patient) => {
      loadFullEmrTimeline(patient);
    }
  });

  const params = new URLSearchParams(window.location.search);
  const uhid = params.get('uhid');
  if (uhid) {
    fetchPatientByUhid(uhid);
  }
});

async function fetchPatientByUhid(uhid) {
  try {
    const res = await apiFetch(`/api/patients?search=${encodeURIComponent(uhid)}`);
    if (res.data && res.data.length) {
      loadFullEmrTimeline(res.data[0]);
    }
  } catch (err) {
    console.error('EMR fetch error:', err);
  }
}

async function loadFullEmrTimeline(patient) {
  const profileCard = document.getElementById('patientProfileCard');
  profileCard.classList.remove('d-none');
  document.getElementById('emrPatientName').textContent = patient.fullName;
  document.getElementById('emrUhidText').textContent = patient.uhid;
  document.getElementById('emrAgeText').textContent = `${patient.gender || 'M'}, ${patient.age?.value || patient.age || 'N/A'} Yrs`;
  document.getElementById('emrPhoneText').textContent = patient.phone || 'N/A';
  document.getElementById('emrBloodGroupText').textContent = patient.bloodGroup || 'Unknown';

  const container = document.getElementById('emrTimelineContainer');
  container.innerHTML = `<div class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Aggregating 360° clinical history across departments...</div>`;

  try {
    const [erRes, nurRes, labRes, radRes, billRes, icuRes, otRes, bbRes, spRes] = await Promise.all([
      apiFetch(`/api/emergency?search=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/nursing?uhid=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/pathology?search=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/radiology?search=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/hospital-billing?search=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/icu?search=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/ot?search=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/blood-bank?search=${patient.uhid}`).catch(() => ({ data: [] })),
      apiFetch(`/api/specialty-clinics?search=${patient.uhid}`).catch(() => ({ data: [] }))
    ]);

    const events = [];

    (erRes.data || []).forEach(e => {
      events.push({
        date: new Date(e.createdAt),
        type: 'Emergency Triage',
        icon: 'bi-heart-pulse-fill bg-danger',
        title: `ER Admission — ${e.triageCategory || 'Urgent'} (Bed: ${e.bedNumber})`,
        details: `BP: ${e.vitalSigns?.bp || 'N/A'} | Complaint: ${e.chiefComplaint || 'None'}`
      });
    });

    (icuRes.data || []).forEach(i => {
      events.push({
        date: new Date(i.createdAt),
        type: 'ICU / CCU',
        icon: 'bi-activity bg-danger',
        title: `ICU Monitoring — ${i.bedNumber}`,
        details: `Ventilator: ${i.ventilatorStatus} | BP: ${i.vitalsFlowsheet?.bp || 'N/A'}`
      });
    });

    (otRes.data || []).forEach(o => {
      events.push({
        date: new Date(o.createdAt),
        type: 'Operation Theatre',
        icon: 'bi-scissors bg-dark',
        title: `Surgery: ${o.procedureName} (${o.otRoom})`,
        details: `Surgeon: ${o.leadSurgeon} | Anesthetist: ${o.anesthetist}`
      });
    });

    (bbRes.data || []).forEach(b => {
      events.push({
        date: new Date(b.createdAt),
        type: 'Blood Bank',
        icon: 'bi-droplet-fill bg-danger',
        title: `Cross-Matched Blood Bag: ${b.bagId} (${b.bloodGroup})`,
        details: `Component: ${b.componentType} (${b.quantityMl} ml)`
      });
    });

    (spRes.data || []).forEach(s => {
      events.push({
        date: new Date(s.createdAt),
        type: `Specialty (${s.department})`,
        icon: 'bi-hospital bg-primary',
        title: `${s.department} Consultation — ${s.doctorName}`,
        details: `${s.clinicalDetails?.notes || s.clinicalDetails || 'N/A'}`
      });
    });

    (nurRes.data || []).forEach(n => {
      events.push({
        date: new Date(n.createdAt),
        type: 'Nursing MAR',
        icon: 'bi-person-workspace bg-primary',
        title: `Nursing Note by ${n.nurseName}`,
        details: `MAR: ${n.marRecords?.map(m => m.medicineName).join(', ') || 'Vitals checked'} | Handover: ${n.shiftHandover || 'Normal'}`
      });
    });

    (labRes.data || []).forEach(l => {
      events.push({
        date: new Date(l.createdAt),
        type: 'Pathology Lab',
        icon: 'bi-eyedropper bg-purple',
        title: `Lab Test: ${l.testName} (${l.barcode})`,
        details: `Category: ${l.category} | Status: ${l.status}`
      });
    });

    (radRes.data || []).forEach(r => {
      events.push({
        date: new Date(r.createdAt),
        type: 'Radiology',
        icon: 'bi-x-diamond-fill bg-info',
        title: `${r.modality}: ${r.procedureName}`,
        details: `Radiologist: ${r.radiologistName || 'Dr. Radiologist'} | Status: ${r.status}`
      });
    });

    (billRes.data || []).forEach(b => {
      events.push({
        date: new Date(b.createdAt),
        type: 'Hospital Billing',
        icon: 'bi-receipt bg-success',
        title: `Invoice ${b.id} — Total: ৳${b.netAmount}`,
        details: `Status: ${b.paymentStatus} (Paid: ৳${b.paidAmount}, Due: ৳${b.dueAmount})`
      });
    });

    events.sort((a, b) => b.date - a.date);

    if (!events.length) {
      container.innerHTML = `<div class="text-center text-muted py-4">No recorded medical history for UHID: ${patient.uhid}</div>`;
      return;
    }

    container.innerHTML = events.map(ev => `
      <div class="timeline-item">
        <div class="timeline-icon ${ev.icon}"></div>
        <div class="card border-0 shadow-sm">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="badge bg-light text-dark border">${ev.type}</span>
              <small class="text-muted">${ev.date.toLocaleString()}</small>
            </div>
            <h6 class="fw-bold mb-1">${ev.title}</h6>
            <div class="small text-secondary">${ev.details}</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error populating EMR timeline:', err);
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to load EMR timeline records.</div>`;
  }
}
