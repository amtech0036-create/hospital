document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/diagnostics-billing.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Diagnostic Billing & Invoice Generation';

  let selectedTests = [];

  // Patient Search Handler
  const searchInput = document.getElementById('patientSearchInput');
  const searchResults = document.getElementById('patientSearchResults');

  searchInput?.addEventListener('input', async (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchResults.classList.add('d-none');
      return;
    }

    try {
      const res = await apiRequest(`/customers?search=${encodeURIComponent(q)}`);
      const patients = res.data || [];
      if (patients.length === 0) {
        searchResults.innerHTML = '<li class="list-group-item small text-muted">No matching patient found. Fill details below for new UHID.</li>';
      } else {
        searchResults.innerHTML = patients.map((p) => `
          <li class="list-group-item list-group-item-action small py-2 cursor-pointer" data-uhid="${p.uhid || p.id}" data-name="${p.name || p.fullName}" data-phone="${p.phone}" data-gender="${p.gender || 'Male'}" data-age="${p.age?.value || p.age || 30}">
            <strong>${p.name || p.fullName}</strong> (${p.uhid || p.id}) - ${p.phone}
          </li>
        `).join('');
      }
      searchResults.classList.remove('d-none');
    } catch (err) {
      searchResults.classList.add('d-none');
    }
  });

  searchResults?.addEventListener('click', (e) => {
    const item = e.target.closest('li');
    if (!item || !item.dataset.name) return;

    document.getElementById('patientId').value = item.dataset.uhid || '';
    document.getElementById('uhid').value = item.dataset.uhid || '';
    document.getElementById('fullName').value = item.dataset.name || '';
    document.getElementById('phone').value = item.dataset.phone || '';
    document.getElementById('gender').value = item.dataset.gender || 'Male';
    document.getElementById('ageValue').value = item.dataset.age || 30;

    searchResults.classList.add('d-none');
    searchInput.value = item.dataset.name;
  });

  // 1. Card Body Direct "Register & Save to Patient Master" Handler
  document.getElementById('btnAddPatientFromForm')?.addEventListener('click', async () => {
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const gender = document.getElementById('gender').value;
    const ageValue = Number(document.getElementById('ageValue').value) || 0;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const referredDoctor = document.getElementById('referredDoctor').value.trim();

    if (!fullName || !phone || !ageValue) {
      alert('Please fill in Full Name, Phone, and Age before registering patient.');
      return;
    }

    const payload = {
      fullName,
      gender,
      age: { value: ageValue, unit: 'Years' },
      phone,
      bloodGroup,
      referredDoctor: { name: referredDoctor }
    };

    try {
      const res = await apiRequest('/patients', { method: 'POST', body: payload });
      const newPatient = res.data || {};

      document.getElementById('patientId').value = newPatient.id || newPatient.uhid;
      document.getElementById('uhid').value = newPatient.uhid || newPatient.id;

      alert(`Patient successfully registered in Patient Master with assigned UHID: ${newPatient.uhid || newPatient.id}`);
    } catch (err) {
      alert(err.message || 'Failed to register patient in Master.');
    }
  });

  // 2. Doctor Search Autocomplete (300ms Debounce)
  const docInput = document.getElementById('referredDoctor');
  const docResults = document.getElementById('doctorSearchResults');
  let docDebounceTimer = null;

  docInput?.addEventListener('input', (e) => {
    clearTimeout(docDebounceTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      docResults.classList.add('d-none');
      return;
    }

    docDebounceTimer = setTimeout(async () => {
      try {
        const res = await apiRequest(`/doctors?search=${encodeURIComponent(q)}`);
        const doctors = res.data || [];
        if (doctors.length === 0) {
          docResults.innerHTML = `<li class="list-group-item small text-muted">No doctor found. Will use "${q}" as text.</li>`;
        } else {
          docResults.innerHTML = doctors.map((d) => `
            <li class="list-group-item list-group-item-action small py-2 cursor-pointer" data-id="${d.id}" data-name="${d.name}">
              <strong>${d.name}</strong> <span class="badge bg-info text-dark ms-1">${d.specialization}</span> (${d.department})
            </li>
          `).join('');
        }
        docResults.classList.remove('d-none');
      } catch (err) {
        docResults.classList.add('d-none');
      }
    }, 300);
  });

  docResults?.addEventListener('click', (e) => {
    const item = e.target.closest('li');
    if (!item || !item.dataset.name) return;
    document.getElementById('referredDoctorId').value = item.dataset.id || '';
    docInput.value = item.dataset.name;
    docResults.classList.add('d-none');
  });

  // 3. Searchable Diagnostic Test Catalog Master Autocomplete
  const testSearchInput = document.getElementById('testCatalogSearchInput');
  const testSearchResults = document.getElementById('testCatalogSearchResults');
  const btnAddTest = document.getElementById('btnAddTest');
  let selectedCatalogItem = null;
  let testSearchDebounce = null;

  const defaultCatalog = [
    { code: 'LAB-CBC', name: 'Complete Blood Count (CBC)', department: 'Pathology', price: 500 },
    { code: 'LAB-LFT', name: 'Liver Function Test (LFT)', department: 'Pathology', price: 1200 },
    { code: 'LAB-KFT', name: 'Kidney Function Test (KFT)', department: 'Pathology', price: 1000 },
    { code: 'RAD-MRI-BRAIN', name: 'MRI Brain (Plain)', department: 'Radiology', price: 5500 },
    { code: 'RAD-CT-CHEST', name: 'CT Scan Chest', department: 'Radiology', price: 4500 },
    { code: 'RAD-XRAY-CHEST', name: 'X-Ray Chest PA View', department: 'Radiology', price: 500 },
    { code: 'RAD-USG-ABD', name: 'USG Whole Abdomen', department: 'Radiology', price: 1500 }
  ];

  testSearchInput?.addEventListener('input', (e) => {
    clearTimeout(testSearchDebounce);
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 1) {
      testSearchResults.classList.add('d-none');
      return;
    }

    testSearchDebounce = setTimeout(async () => {
      let catalogList = [];
      try {
        const res = await apiRequest('/diagnostics/tests');
        catalogList = res.data && res.data.length > 0 ? res.data : defaultCatalog;
      } catch (err) {
        catalogList = defaultCatalog;
      }

      const matches = catalogList.filter(
        (t) => (t.code || '').toLowerCase().includes(q) || (t.name || '').toLowerCase().includes(q)
      );

      if (matches.length === 0) {
        testSearchResults.innerHTML = '<li class="list-group-item small text-muted py-2">No matching diagnostic test found in Master.</li>';
      } else {
        testSearchResults.innerHTML = matches.map((t) => `
          <li class="list-group-item list-group-item-action small py-2 cursor-pointer" data-code="${t.code}" data-name="${t.name}" data-dept="${t.department}" data-price="${t.price}">
            <strong>${t.code}</strong> - ${t.name} <span class="badge ${t.department === 'Pathology' ? 'bg-info' : 'bg-warning'} text-dark ms-1">${t.department}</span>
            <span class="float-end fw-bold text-success">${Number(t.price).toFixed(2)} BDT</span>
          </li>
        `).join('');
      }

      testSearchResults.classList.remove('d-none');
    }, 200);
  });

  testSearchResults?.addEventListener('click', (e) => {
    const item = e.target.closest('li');
    if (!item || !item.dataset.code) return;

    selectedCatalogItem = {
      testId: item.dataset.code,
      testCode: item.dataset.code,
      testName: item.dataset.name,
      department: item.dataset.dept,
      price: parseFloat(item.dataset.price) || 0
    };

    testSearchInput.value = `${selectedCatalogItem.testCode} - ${selectedCatalogItem.testName} (${selectedCatalogItem.price} BDT)`;
    testSearchResults.classList.add('d-none');
  });

  btnAddTest?.addEventListener('click', () => {
    if (!selectedCatalogItem) {
      alert('Please search and select a diagnostic test from the master catalog dropdown.');
      return;
    }

    if (selectedTests.some((t) => t.testCode === selectedCatalogItem.testCode)) {
      alert('This test is already added to the order.');
      return;
    }

    selectedTests.push({ ...selectedCatalogItem });
    renderTable();
    testSearchInput.value = '';
    selectedCatalogItem = null;
  });

  function renderTable() {
    const tbody = document.getElementById('orderItemsTbody');
    if (selectedTests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No tests added yet. Select a test from above.</td></tr>';
      updateTally();
      return;
    }

    tbody.innerHTML = selectedTests.map((t, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${t.testCode}</strong> - ${t.testName}</td>
        <td><span class="badge ${t.department === 'Pathology' ? 'bg-info' : 'bg-warning'} text-dark">${t.department}</span></td>
        <td class="text-end">${t.price.toFixed(2)} BDT</td>
        <td class="text-center">
          <button type="button" class="btn btn-outline-danger btn-sm btn-remove-test" data-index="${idx}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-remove-test').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        selectedTests.splice(idx, 1);
        renderTable();
      });
    });

    updateTally();
  }

  function updateTally() {
    const subtotal = selectedTests.reduce((sum, item) => sum + item.price, 0);
    const discount = parseFloat(document.getElementById('calcDiscount').value) || 0;
    const net = Math.max(0, subtotal - discount);
    const paid = parseFloat(document.getElementById('calcPaid').value) || 0;
    const due = Math.max(0, net - paid);

    document.getElementById('calcTotal').value = subtotal.toFixed(2);
    document.getElementById('calcNet').value = net.toFixed(2);
    document.getElementById('calcDue').textContent = `${due.toFixed(2)} BDT`;
  }

  document.getElementById('calcDiscount')?.addEventListener('input', updateTally);
  document.getElementById('calcPaid')?.addEventListener('input', updateTally);

  // Submit Order API Connection
  const btnSubmitOrder = document.getElementById('btnSubmitOrder');
  btnSubmitOrder?.addEventListener('click', async () => {
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const gender = document.getElementById('gender').value;
    const ageVal = document.getElementById('ageValue').value;

    if (!fullName || !phone || !ageVal) {
      alert('Please fill out patient name, phone, and age.');
      return;
    }

    if (selectedTests.length === 0) {
      alert('Please add at least one diagnostic test to the order.');
      return;
    }

    const payload = {
      patientData: {
        uhid: document.getElementById('uhid').value.trim(),
        fullName,
        gender,
        age: { value: Number(ageVal), unit: 'Years' },
        phone,
        bloodGroup: document.getElementById('bloodGroup').value,
        referredDoctor: { name: document.getElementById('referredDoctor').value.trim() }
      },
      tests: selectedTests,
      discountAmount: parseFloat(document.getElementById('calcDiscount').value) || 0,
      paidAmount: parseFloat(document.getElementById('calcPaid').value) || 0
    };

    try {
      btnSubmitOrder.disabled = true;
      btnSubmitOrder.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

      const res = await apiRequest('/diagnostics/orders', { method: 'POST', body: payload });
      const orderData = res.data.order;
      const patientData = res.data.patient;

      renderPrintableInvoice(orderData, patientData);

      const printModal = new bootstrap.Modal(document.getElementById('printModal'));
      printModal.show();
    } catch (err) {
      alert(err.message || 'Failed to generate diagnostic order.');
    } finally {
      btnSubmitOrder.disabled = false;
      btnSubmitOrder.innerHTML = '<i class="bi bi-qr-code-scan me-2"></i>Generate Invoice & Barcodes';
    }
  });

  function renderPrintableInvoice(order, patient) {
    const printEl = document.getElementById('printableInvoice');

    printEl.innerHTML = `
      <div class="p-4 bg-white border">
        <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
          <div>
            <h4 class="fw-bold text-primary mb-1">HOSPITAL DIAGNOSTIC INFORMATION SYSTEM</h4>
            <div class="small text-muted">Invoice #: <strong>${order.invoiceNumber}</strong></div>
            <div class="small text-muted">Date: ${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div class="text-end">
            <svg id="mainOrderBarcode" class="barcode-svg"></svg>
            <div class="specimen-badge fw-bold text-dark">${order.orderBarcode}</div>
            <div class="small text-muted">(Invoice Master Barcode)</div>
          </div>
        </div>

        <div class="row mb-3 bg-light p-3 rounded">
          <div class="col-6">
            <div><strong>Patient Name:</strong> ${patient.fullName}</div>
            <div><strong>UHID:</strong> ${patient.uhid}</div>
            <div><strong>Gender / Age:</strong> ${patient.gender} / ${typeof patient.age === 'object' ? patient.age.value + ' ' + patient.age.unit : patient.age}</div>
          </div>
          <div class="col-6 text-end">
            <div><strong>Phone:</strong> ${patient.phone}</div>
            <div><strong>Blood Group:</strong> ${patient.bloodGroup || 'Unknown'}</div>
            <div><strong>Ref. Doctor:</strong> ${order.referredDoctor?.name || 'Self / General'}</div>
          </div>
        </div>

        <h6 class="fw-bold mb-2">Ordered Tests</h6>
        <table class="table table-bordered align-middle mb-4">
          <thead class="table-secondary">
            <tr><th>#</th><th>Test Code & Description</th><th>Department</th><th class="text-end">Amount</th></tr>
          </thead>
          <tbody>
            ${order.tests.map((t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${t.testCode}</strong> - ${t.testName}</td>
                <td><span class="badge bg-secondary">${t.department}</span></td>
                <td class="text-end">${t.price.toFixed(2)} BDT</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="row mb-4">
          <div class="col-6">
            <div class="p-3 border rounded bg-light">
              <div class="small text-muted fw-bold mb-1">SPECIMEN COLLECTION INSTRUCTION</div>
              <div class="small text-secondary">Specimen tube barcodes will be printed on demand by the Pathology / Radiology department upon scanning this master barcode.</div>
            </div>
          </div>
          <div class="col-6">
            <div class="card p-3 border-0 bg-light">
              <div class="d-flex justify-content-between mb-1"><span>Subtotal:</span><span>${order.financials.totalAmount.toFixed(2)} BDT</span></div>
              <div class="d-flex justify-content-between mb-1"><span>Discount:</span><span>-${order.financials.discountAmount.toFixed(2)} BDT</span></div>
              <div class="d-flex justify-content-between mb-1 fw-bold border-top pt-1"><span>Net Amount:</span><span>${order.financials.netAmount.toFixed(2)} BDT</span></div>
              <div class="d-flex justify-content-between mb-1 text-success"><span>Paid:</span><span>${order.financials.paidAmount.toFixed(2)} BDT</span></div>
              <div class="d-flex justify-content-between fw-bold text-danger"><span>Due:</span><span>${order.financials.dueAmount.toFixed(2)} BDT</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      if (window.JsBarcode) {
        JsBarcode('#mainOrderBarcode', order.orderBarcode, { format: 'CODE128', height: 45, displayValue: false });
      }
    }, 100);
  }
});
