let selectedBillingPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/hospital-billing.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Central Hospital Billing Counter';

  initBillingSearch();
  loadInvoices();

  document.querySelectorAll('.bill-calc').forEach(el => el.addEventListener('input', updateTotals));
  document.getElementById('btnRefreshBilling').addEventListener('click', loadInvoices);
  document.getElementById('btnSaveInvoice').addEventListener('click', saveInvoice);
});

function initBillingSearch() {
  new SearchComponent('#billingSearchContainer', {
    endpoint: '/api/hospital-billing',
    placeholder: 'Search Invoices by Invoice ID, Patient UHID, Name...',
    displayFormatter: (item) => `${item.id || 'Invoice'} — ${item.patientName || item.uhid || 'Patient'} (Net: ৳${item.netAmount || 0})`,
    subFormatter: (item) => `Paid: ৳${item.paidAmount || 0} | Due: ৳${item.dueAmount || 0} | Status: ${item.status || 'Issued'}`,
    onSelect: (item) => {
      loadInvoices(item.uhid || item.id);
    }
  });

  new SearchComponent('#billingModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for master billing invoice...',
    displayFormatter: (patient) => `${patient.uhid} — ${patient.fullName} (${patient.phone || ''})`,
    onSelect: (patient) => {
      selectedBillingPatient = patient;
    }
  });
}

function updateTotals() {
  const opd = parseFloat(document.getElementById('billOpd').value) || 0;
  const ipd = parseFloat(document.getElementById('billIpd').value) || 0;
  const phm = parseFloat(document.getElementById('billPharmacy').value) || 0;
  const diag = parseFloat(document.getElementById('billDiagnostics').value) || 0;
  const er = parseFloat(document.getElementById('billEmergency').value) || 0;
  const disc = parseFloat(document.getElementById('billDiscount').value) || 0;

  const gross = opd + ipd + phm + diag + er;
  const net = Math.max(0, gross - disc);

  document.getElementById('lblGrossTotal').textContent = `৳${gross.toFixed(2)}`;
  document.getElementById('lblDiscount').textContent = `৳${disc.toFixed(2)}`;
  document.getElementById('lblNetPayable').textContent = `৳${net.toFixed(2)}`;
}

async function loadInvoices(searchQuery = '') {
  const tbody = document.getElementById('billingTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading invoices...</td></tr>`;

    let url = `/api/hospital-billing?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const invoices = res.data || [];

    if (!invoices.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hospital invoices found.</td></tr>`;
      return;
    }

    tbody.innerHTML = invoices.map(item => {
      const statusBadge = {
        'Paid': 'bg-success text-white',
        'Partial': 'bg-warning text-dark',
        'Unpaid': 'bg-danger text-white'
      }[item.paymentStatus] || 'bg-secondary';

      return `
        <tr>
          <td>
            <div class="fw-bold text-dark">${item.id}</div>
            <div class="small text-muted">${new Date(item.createdAt).toLocaleDateString()}</div>
          </td>
          <td>
            <div class="fw-bold text-dark">${item.patientName}</div>
            <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
          </td>
          <td class="fw-semibold">৳${(item.totalAmount || 0).toFixed(2)}</td>
          <td class="text-danger small">৳${(item.discount || 0).toFixed(2)}</td>
          <td class="fw-bold text-success">৳${(item.netAmount || 0).toFixed(2)}</td>
          <td class="small">
            Paid: ৳${(item.paidAmount || 0).toFixed(2)}<br/>
            <span class="text-danger">Due: ৳${(item.dueAmount || 0).toFixed(2)}</span>
          </td>
          <td><span class="badge ${statusBadge} px-2.5 py-1.5">${item.paymentStatus}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary" onclick="printReceipt('${item.id}')">
              <i class="bi bi-printer me-1"></i> Receipt
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load billing invoices:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load invoices.</td></tr>`;
  }
}

async function saveInvoice() {
  if (!selectedBillingPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const opd = parseFloat(document.getElementById('billOpd').value) || 0;
  const ipd = parseFloat(document.getElementById('billIpd').value) || 0;
  const phm = parseFloat(document.getElementById('billPharmacy').value) || 0;
  const diag = parseFloat(document.getElementById('billDiagnostics').value) || 0;
  const er = parseFloat(document.getElementById('billEmergency').value) || 0;
  const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
  const totalAmount = opd + ipd + phm + diag + er;
  const paidAmount = parseFloat(document.getElementById('billPaid').value) || 0;

  const payload = {
    patientId: selectedBillingPatient.id,
    uhid: selectedBillingPatient.uhid,
    patientName: selectedBillingPatient.fullName,
    departmentBreakdown: { opd, ipd, pharmacy: phm, diagnostics: diag, emergency: er },
    totalAmount,
    discount,
    paidAmount,
    paymentMethod: document.getElementById('billMethod').value
  };

  try {
    const res = await apiFetch('/api/hospital-billing', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newHospitalInvoiceModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('billingForm').reset();
      selectedBillingPatient = null;
      updateTotals();
      loadInvoices();
    } else {
      alert(res.message || 'Failed to generate invoice.');
    }
  } catch (err) {
    console.error('Error generating invoice:', err);
    alert('Failed to connect to hospital billing endpoint.');
  }
}

function printReceipt(id) {
  alert(`Printing invoice receipt for Invoice ID ${id}`);
}
