document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/patient-portal.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Patient Self-Service Portal';

  new SearchComponent('#patientPortalSearchContainer', {
    endpoint: '/api/patients',
    placeholder: 'Search Patient Profile by UHID, Name, Mobile...',
    onSelect: (patient) => {
      loadPatientPortalData(patient);
    }
  });
});

async function loadPatientPortalData(patient) {
  const dash = document.getElementById('portalDashboard');
  dash.classList.remove('d-none');

  document.getElementById('portalName').textContent = patient.fullName;
  document.getElementById('portalUhid').textContent = patient.uhid;

  try {
    const res = await apiFetch(`/api/hospital-billing?search=${patient.uhid}`);
    const invoices = res.data || [];

    let paid = 0;
    let due = 0;
    invoices.forEach(i => {
      paid += (i.paidAmount || 0);
      due += (i.dueAmount || 0);
    });

    document.getElementById('portalPaid').textContent = `৳${paid.toFixed(2)}`;
    document.getElementById('portalDue').textContent = `৳${due.toFixed(2)}`;
    document.getElementById('portalRxCount').textContent = `3 Prescriptions`;
    document.getElementById('portalFollowup').textContent = `In 7 Days`;
  } catch (err) {
    console.error('Portal load error:', err);
  }
}
