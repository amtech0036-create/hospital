document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/diagnostics-approval.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Doctor Worklist, Approval & PDF Report Generation';

  let savedSignature = {
    name: 'Dr. A. Rahman, MD (Pathology)',
    hash: 'SIG-HASH-' + Date.now(),
    url: ''
  };

  const user = getCurrentUser();
  if (user) {
    document.getElementById('currentDoctorBadge').textContent = `Verifying Doctor: ${user.name} (${user.role})`;
  }

  // Load Worklist Queue
  loadWorklistQueue();

  document.getElementById('btnRefreshWorklist')?.addEventListener('click', loadWorklistQueue);

  // Digital Signature Modal Handlers
  const sigNameInput = document.getElementById('sigNameInput');
  const sigPreviewText = document.getElementById('sigPreviewText');
  const sigHashPreview = document.getElementById('sigHashPreview');

  sigNameInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim() || 'Dr. Doctor Name';
    sigPreviewText.textContent = val;
    savedSignature.name = val;
  });

  document.getElementById('btnSaveSignature')?.addEventListener('click', () => {
    savedSignature.hash = 'SIG-HASH-' + Date.now();
    sigHashPreview.textContent = savedSignature.hash;
    alert('Doctor digital signature stamp configured successfully.');
  });

  async function loadWorklistQueue() {
    const tbody = document.getElementById('worklistTbody');
    try {
      // Fetch scan / orders
      const res = await apiRequest('/diagnostics/scan/INV-');
      const data = res.data ? [res.data] : [];
      renderWorklistTable(data);
    } catch (err) {
      // Fallback demo queue if no order scanned yet
      renderDemoWorklistTable();
    }
  }

  function renderDemoWorklistTable() {
    const tbody = document.getElementById('worklistTbody');
    const demoItems = [
      {
        resultId: 'DRES-000001',
        orderId: 'DORD-000001',
        invoiceNumber: 'INV-20260820-0001',
        uhid: 'UHID-DEFAULT-20260820-0001',
        patientName: 'John Doe',
        department: 'Pathology',
        testName: 'Complete Blood Count (CBC)',
        status: 'result_ready',
        enteredBy: 'Lab_Technician',
        enteredAt: new Date().toISOString()
      },
      {
        resultId: 'DRES-000002',
        orderId: 'DORD-000002',
        invoiceNumber: 'INV-20260820-0002',
        uhid: 'UHID-DEFAULT-20260820-0002',
        patientName: 'Jane Smith',
        department: 'Radiology',
        testName: 'MRI Brain (Plain)',
        status: 'result_ready',
        enteredBy: 'Rad_Technician',
        enteredAt: new Date().toISOString()
      }
    ];

    tbody.innerHTML = demoItems.map((item) => `
      <tr>
        <td>
          <div class="fw-bold">${item.invoiceNumber}</div>
          <small class="text-muted">${item.uhid}</small>
        </td>
        <td><strong>${item.patientName}</strong></td>
        <td>
          <span class="badge ${item.department === 'Pathology' ? 'bg-info' : 'bg-warning'} text-dark">${item.department}</span>
          <div class="small">${item.testName}</div>
        </td>
        <td><span class="badge bg-primary">${item.status}</span></td>
        <td>
          <div>${item.enteredBy}</div>
          <small class="text-muted">${new Date(item.enteredAt).toLocaleTimeString()}</small>
        </td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-success me-1 btn-approve" data-resultid="${item.resultId}" data-orderid="${item.orderId}">
            <i class="bi bi-check-circle me-1"></i>Approve & Sign
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary btn-print-pdf" data-orderid="${item.orderId}">
            <i class="bi bi-file-earmark-pdf me-1"></i>Preview PDF
          </button>
        </td>
      </tr>
    `).join('');

    attachActionEvents();
  }

  function renderWorklistTable(items) {
    const tbody = document.getElementById('worklistTbody');
    if (!items || items.length === 0) {
      renderDemoWorklistTable();
      return;
    }

    tbody.innerHTML = items.map((item) => `
      <tr>
        <td>
          <div class="fw-bold">${item.order?.invoiceNumber || item.invoiceNumber}</div>
          <small class="text-muted">${item.order?.uhid || item.uhid}</small>
        </td>
        <td><strong>${item.patient?.fullName || item.patientSnapshot?.fullName || 'Patient'}</strong></td>
        <td>
          <span class="badge bg-info text-dark">${item.results?.[0]?.department || 'Pathology'}</span>
          <div class="small">${item.orderedTests?.[0]?.testName || 'Diagnostic Test'}</div>
        </td>
        <td><span class="badge bg-primary">${item.results?.[0]?.status || 'result_ready'}</span></td>
        <td>
          <div>${item.results?.[0]?.enteredBy || 'Technician'}</div>
          <small class="text-muted">${new Date().toLocaleTimeString()}</small>
        </td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-success me-1 btn-approve" data-resultid="${item.results?.[0]?.id || 'DRES-000001'}" data-orderid="${item.order?.id || 'DORD-000001'}">
            <i class="bi bi-check-circle me-1"></i>Approve & Sign
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary btn-print-pdf" data-orderid="${item.order?.id || 'DORD-000001'}">
            <i class="bi bi-file-earmark-pdf me-1"></i>Preview PDF
          </button>
        </td>
      </tr>
    `).join('');

    attachActionEvents();
  }

  function attachActionEvents() {
    document.querySelectorAll('.btn-approve').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const resultId = e.currentTarget.dataset.resultid;
        const orderId = e.currentTarget.dataset.orderid;

        try {
          const res = await apiRequest('/diagnostics/results/authorize', {
            method: 'PATCH',
            body: {
              resultId,
              authorizedBy: savedSignature.name,
              digitalSignature: { hash: savedSignature.hash }
            }
          });
          alert(res.message || 'Result digitally approved successfully.');
          openPdfReportModal(orderId);
        } catch (err) {
          alert(err.message || 'Failed to authorize result.');
        }
      });
    });

    document.querySelectorAll('.btn-print-pdf').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderid;
        openPdfReportModal(orderId);
      });
    });
  }

  async function openPdfReportModal(orderId) {
    try {
      const res = await apiRequest(`/diagnostics/reports/${encodeURIComponent(orderId)}/print`);
      const report = res.data;
      renderPdfReportLayout(report);
      const pdfModal = new bootstrap.Modal(document.getElementById('pdfPrintModal'));
      pdfModal.show();
    } catch (err) {
      // Render clean fallback PDF layout for preview
      renderFallbackPdfReportLayout(orderId);
      const pdfModal = new bootstrap.Modal(document.getElementById('pdfPrintModal'));
      pdfModal.show();
    }
  }

  function renderPdfReportLayout(data) {
    const el = document.getElementById('printablePdfReport');
    const header = data.reportHeader || {};
    const patient = data.patientInfo || {};

    el.innerHTML = `
      <div class="p-4 bg-white border" style="min-height: 800px;">
        <div class="d-flex justify-content-between align-items-start border-bottom border-2 border-primary pb-3 mb-3">
          <div>
            <h3 class="fw-bold text-primary mb-1">${header.title || 'HOSPITAL DIAGNOSTIC INFORMATION SYSTEM'}</h3>
            <div class="text-muted small">Pathology LIS & Radiology RIS Diagnostic Report</div>
            <div class="small mt-1">Invoice #: <strong>${header.invoiceNumber}</strong> | Date: ${new Date(header.orderDate || Date.now()).toLocaleDateString()}</div>
          </div>
          <div class="text-end">
            <svg id="pdfReportBarcode" class="barcode-svg"></svg>
            <div class="small font-monospace">${header.orderBarcode || 'INV-BARCODE'}</div>
          </div>
        </div>

        <!-- Patient Header Card -->
        <div class="row g-2 mb-4 p-3 bg-light rounded border">
          <div class="col-6">
            <div><strong>Patient Name:</strong> ${patient.fullName}</div>
            <div><strong>UHID:</strong> <span class="badge bg-primary">${patient.uhid}</span></div>
            <div><strong>Gender / Age:</strong> ${patient.gender} / ${patient.age}</div>
          </div>
          <div class="col-6 text-end">
            <div><strong>Phone:</strong> ${patient.phone}</div>
            <div><strong>Blood Group:</strong> ${patient.bloodGroup}</div>
            <div><strong>Referred By:</strong> ${patient.referredDoctor?.name || 'Self / General'}</div>
          </div>
        </div>

        <!-- Diagnostic Findings & Results -->
        ${data.tests.map((t, idx) => `
          <div class="mb-4">
            <div class="bg-secondary text-white p-2 rounded mb-2 fw-bold d-flex justify-content-between">
              <span>Test ${idx + 1}: ${t.testName} (${t.department})</span>
              <span class="badge bg-success">Status: ${t.resultStatus}</span>
            </div>

            ${t.pathologyResults && t.pathologyResults.length > 0 ? `
              <table class="table table-bordered align-middle mb-3">
                <thead class="table-light">
                  <tr><th>Parameter</th><th class="text-center">Result</th><th>Unit</th><th>Reference Range</th><th class="text-center">Flag</th></tr>
                </thead>
                <tbody>
                  ${t.pathologyResults.map((pr) => `
                    <tr class="${pr.isCritical ? 'table-danger fw-bold' : ''}">
                      <td>${pr.parameterName}</td>
                      <td class="text-center fw-bold">${pr.resultValue}</td>
                      <td>${pr.unit || ''}</td>
                      <td>${pr.referenceRange || ''}</td>
                      <td class="text-center">${pr.isCritical ? '<span class="badge bg-danger">HIGH / CRITICAL</span>' : '<span class="badge bg-success">NORMAL</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            ${t.radiologyReport && t.radiologyReport.findings ? `
              <div class="p-3 border rounded bg-light mb-3">
                <div class="mb-2"><strong>Clinical History:</strong> ${t.radiologyReport.clinicalHistory || 'N/A'}</div>
                <div class="mb-2"><strong>Technique:</strong> ${t.radiologyReport.technique || 'N/A'}</div>
                <div class="mb-2"><strong>Findings:</strong></div>
                <p class="border-start border-3 border-primary ps-3 text-dark">${t.radiologyReport.findings}</p>
                <div><strong>Impression / Conclusion:</strong></div>
                <p class="border-start border-3 border-warning ps-3 fw-bold text-dark">${t.radiologyReport.impression}</p>
              </div>
            ` : ''}
          </div>
        `).join('')}

        <!-- Digital Signature Footer -->
        <div class="d-flex justify-content-between align-items-end border-top pt-4 mt-5">
          <div class="small text-muted">
            <div>Report Generated via Hospital HIS/LIS Platform</div>
            <div>Verification Code: <code>${header.orderBarcode}</code></div>
          </div>
          <div class="text-center border p-3 rounded bg-light" style="min-width: 250px;">
            <div class="sig-preview mb-1">${savedSignature.name}</div>
            <div class="small fw-bold text-primary">Digitally Verified & Authorized</div>
            <div class="small text-muted">Stamp Hash: ${savedSignature.hash}</div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      if (window.JsBarcode && header.orderBarcode) {
        JsBarcode('#pdfReportBarcode', header.orderBarcode, { format: 'CODE128', height: 40, displayValue: false });
      }
    }, 100);
  }

  function renderFallbackPdfReportLayout(orderId) {
    renderPdfReportLayout({
      reportHeader: {
        title: 'HOSPITAL DIAGNOSTIC INFORMATION SYSTEM',
        invoiceNumber: 'INV-20260820-0001',
        orderBarcode: 'INV-DEFAULT-17714800-8812',
        uhid: 'UHID-DEFAULT-20260820-0001',
        orderDate: new Date().toISOString()
      },
      patientInfo: {
        fullName: 'John Doe',
        uhid: 'UHID-DEFAULT-20260820-0001',
        gender: 'Male',
        age: '35 Years',
        phone: '+8801700000000',
        bloodGroup: 'O+',
        referredDoctor: { name: 'Dr. S. K. Roy' }
      },
      tests: [
        {
          testName: 'Complete Blood Count (CBC)',
          department: 'Pathology',
          resultStatus: 'authorized',
          pathologyResults: [
            { parameterName: 'Hemoglobin (Hb)', resultValue: '14.2', unit: 'g/dL', referenceRange: '12.0 - 16.0', isCritical: false },
            { parameterName: 'Total WBC Count', resultValue: '8200', unit: '/cu.mm', referenceRange: '4000 - 11000', isCritical: false },
            { parameterName: 'Platelet Count', resultValue: '260000', unit: '/cu.mm', referenceRange: '150000 - 450000', isCritical: false }
          ]
        }
      ]
    });
  }
});
