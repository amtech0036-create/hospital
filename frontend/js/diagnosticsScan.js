document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/diagnostics-scan.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Universal Barcode Scanner & Workstation';

  let currentOrderPayload = null;
  let activeTestId = null;

  // USB Barcode Hardware Scanner Keypress Buffer
  let barcodeBuffer = '';
  let lastKeyTime = Date.now();

  window.addEventListener('keydown', (e) => {
    // If typing in an active text input, don't trigger global scanner buffer
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && document.activeElement.id !== 'barcodeInput') {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - lastKeyTime > 100) {
      barcodeBuffer = '';
    }
    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
      if (barcodeBuffer.length >= 3) {
        e.preventDefault();
        fetchScanData(barcodeBuffer.trim());
        barcodeBuffer = '';
      }
    } else if (e.key.length === 1) {
      barcodeBuffer += e.key;
    }
  });

  // Manual Input Form Submission
  const scanForm = document.getElementById('barcodeScanForm');
  scanForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const barcode = document.getElementById('barcodeInput').value.trim();
    if (barcode) {
      fetchScanData(barcode);
    }
  });

  async function fetchScanData(barcode) {
    try {
      document.getElementById('barcodeInput').value = barcode;
      const res = await apiRequest(`/diagnostics/scan/${encodeURIComponent(barcode)}`);
      currentOrderPayload = res.data;
      renderWorkspace();
    } catch (err) {
      alert(err.message || `No diagnostic record found for barcode: ${barcode}`);
    }
  }

  function renderWorkspace() {
    if (!currentOrderPayload) return;

    document.getElementById('workspaceContainer').classList.remove('d-none');

    const patient = currentOrderPayload.patient || {};
    const order = currentOrderPayload.order || {};

    document.getElementById('patientNameDisplay').textContent = patient.fullName || 'Patient';
    document.getElementById('uhidDisplay').textContent = `UHID: ${patient.uhid || order.uhid}`;
    document.getElementById('patientDemographicsDisplay').textContent = `${patient.gender || ''} / ${typeof patient.age === 'object' ? patient.age.value + ' ' + patient.age.unit : patient.age || ''} / ${patient.phone || ''}`;
    document.getElementById('invoiceBarcodeDisplay').textContent = `${order.invoiceNumber} (${order.orderBarcode})`;

    // Render Tests List
    const testsList = document.getElementById('orderedTestsList');
    testsList.innerHTML = currentOrderPayload.orderedTests.map((t, idx) => {
      const isCollected = t.sampleStatus === 'sample_collected' || t.sampleStatus === 'completed';
      return `
        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center test-item-btn ${idx === 0 ? 'active' : ''}" data-testid="${t.testId}">
          <div>
            <div class="fw-bold">${t.testName}</div>
            <small class="${idx === 0 ? 'text-light' : 'text-muted'}">${t.department} | ${t.specimenBarcode}</small>
          </div>
          <span class="badge ${isCollected ? 'bg-success' : 'bg-warning text-dark'}">${t.sampleStatus}</span>
        </button>
      `;
    }).join('');

    // Attach click handler to tests list
    testsList.querySelectorAll('.test-item-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        testsList.querySelectorAll('.test-item-btn').forEach((b) => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        selectTestWorkspace(target.dataset.testid);
      });
    });

    if (currentOrderPayload.orderedTests.length > 0) {
      selectTestWorkspace(currentOrderPayload.orderedTests[0].testId);
    }
  }

  function selectTestWorkspace(testId) {
    activeTestId = testId;
    const testItem = currentOrderPayload.orderedTests.find((t) => t.testId === testId) || currentOrderPayload.orderedTests[0];
    const dept = (testItem.department || 'Pathology').toLowerCase();

    const resultDoc = (currentOrderPayload.results || []).find((r) => r.testId === testId || r.specimenBarcode === testItem.specimenBarcode) || {};

    const pathWs = document.getElementById('pathologyWorkspace');
    const radWs = document.getElementById('radiologyWorkspace');

    if (dept.includes('pathology')) {
      pathWs.classList.remove('d-none');
      radWs.classList.add('d-none');
      renderPathologyParams(testItem, resultDoc);
    } else {
      radWs.classList.remove('d-none');
      pathWs.classList.add('d-none');
      renderRadiologyReport(testItem, resultDoc);
    }
  }

  function renderPathologyParams(testItem, resultDoc) {
    const tbody = document.getElementById('pathologyParamTbody');
    document.getElementById('pathologyTestBadge').textContent = `${testItem.testName} (${testItem.testCode})`;

    const existingParams = resultDoc.pathologyResults || [];
    const defaultParams = existingParams.length > 0 ? existingParams : [
      { parameterName: 'Hemoglobin (Hb)', resultValue: '13.5', unit: 'g/dL', referenceRange: '12.0 - 16.0', isCritical: false },
      { parameterName: 'Total WBC Count', resultValue: '7500', unit: '/cu.mm', referenceRange: '4000 - 11000', isCritical: false },
      { parameterName: 'Platelet Count', resultValue: '250000', unit: '/cu.mm', referenceRange: '150000 - 450000', isCritical: false }
    ];

    tbody.innerHTML = defaultParams.map((p, i) => `
      <tr class="${p.isCritical ? 'critical-alert' : ''}">
        <td><strong>${p.parameterName}</strong></td>
        <td>
          <input type="text" class="form-control form-control-sm param-val" data-index="${i}" value="${p.resultValue || ''}" />
        </td>
        <td><span class="small text-muted">${p.unit || ''}</span></td>
        <td><span class="small text-muted">${p.referenceRange || 'N/A'}</span></td>
        <td class="text-center">
          <input type="checkbox" class="form-check-input param-critical" data-index="${i}" ${p.isCritical ? 'checked' : ''} />
        </td>
      </tr>
    `).join('');
  }

  function renderRadiologyReport(testItem, resultDoc) {
    document.getElementById('radiologyModalityBadge').textContent = `${testItem.department} - ${testItem.testName}`;
    const rad = resultDoc.radiologyReport || {};

    document.getElementById('radClinicalHistory').value = rad.clinicalHistory || '';
    document.getElementById('radTechnique').value = rad.technique || '';
    document.getElementById('radFindings').value = rad.findings || '';
    document.getElementById('radImpression').value = rad.impression || '';
    document.getElementById('radDcmUID').value = rad.dcmStudyInstanceUID || '';
  }

  // Sample Collection Button API Connection
  document.getElementById('btnCollectSample')?.addEventListener('click', async () => {
    if (!currentOrderPayload) return;
    const activeTest = currentOrderPayload.orderedTests.find((t) => t.testId === activeTestId) || currentOrderPayload.orderedTests[0];

    try {
      const res = await apiRequest('/diagnostics/sample-collect', {
        method: 'PATCH',
        body: {
          orderId: currentOrderPayload.order.id,
          specimenBarcode: activeTest.specimenBarcode
        }
      });
      alert(res.message || 'Sample collected successfully.');
      fetchScanData(currentOrderPayload.order.orderBarcode);
    } catch (err) {
      alert(err.message || 'Failed to update sample status.');
    }
  });

  // On-Demand Specimen Tube Label Printing
  document.getElementById('btnPrintTubeLabels')?.addEventListener('click', () => {
    if (!currentOrderPayload) return;

    const patient = currentOrderPayload.patient || {};
    const tests = currentOrderPayload.orderedTests || [];

    const printWin = window.open('', '_blank', 'width=600,height=400');
    if (!printWin) return;

    const labelsHtml = tests.map((t, idx) => `
      <div style="width: 50mm; height: 25mm; padding: 2mm; font-family: sans-serif; font-size: 8pt; border: 1px dashed #333; margin-bottom: 5mm; page-break-after: always;">
        <div style="font-weight: bold; font-size: 8.5pt;">${patient.fullName || 'Patient'}</div>
        <div style="font-size: 7pt;">UHID: ${patient.uhid || ''} | ${t.department}</div>
        <div style="text-align: center; margin-top: 1mm;">
          <svg id="labelBarcode_${idx}" style="max-width: 44mm; height: 9mm;"></svg>
          <div style="font-family: monospace; font-size: 6.5pt;">${t.specimenBarcode}</div>
        </div>
      </div>
    `).join('');

    printWin.document.write(`
      <html>
        <head>
          <title>Specimen Tube Labels Print</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
        </head>
        <body onload="window.print();">
          ${labelsHtml}
          <script>
            setTimeout(() => {
              ${tests.map((t, idx) => `JsBarcode("#labelBarcode_${idx}", "${t.specimenBarcode}", { format: "CODE128", height: 35, displayValue: false });`).join('\n')}
            }, 100);
          <\/script>
        </body>
      </html>
    `);
    printWin.document.close();
  });

  // Save Pathology Result API Connection
  document.getElementById('btnSavePathologyResult')?.addEventListener('click', async () => {
    if (!currentOrderPayload || !activeTestId) return;

    const activeTest = currentOrderPayload.orderedTests.find((t) => t.testId === activeTestId);
    const tbody = document.getElementById('pathologyParamTbody');
    const rows = tbody.querySelectorAll('tr');
    const pathologyResults = [];

    rows.forEach((tr) => {
      const paramName = tr.querySelector('td strong').textContent;
      const resultValue = tr.querySelector('.param-val').value;
      const isCritical = tr.querySelector('.param-critical').checked;
      const unit = tr.querySelector('td:nth-child(3)').textContent;
      const referenceRange = tr.querySelector('td:nth-child(4)').textContent;

      pathologyResults.push({
        parameterName: paramName,
        resultValue,
        unit,
        referenceRange,
        isCritical
      });
    });

    try {
      const res = await apiRequest('/diagnostics/results/save', {
        method: 'POST',
        body: {
          orderId: currentOrderPayload.order.id,
          specimenBarcode: activeTest.specimenBarcode,
          department: 'Pathology',
          pathologyResults
        }
      });
      alert(res.message || 'Pathology parameters saved successfully.');
      fetchScanData(currentOrderPayload.order.orderBarcode);
    } catch (err) {
      alert(err.message || 'Failed to save pathology results.');
    }
  });

  // Save Radiology Report API Connection
  document.getElementById('radiologyReportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentOrderPayload || !activeTestId) return;

    const activeTest = currentOrderPayload.orderedTests.find((t) => t.testId === activeTestId);
    const radiologyReport = {
      clinicalHistory: document.getElementById('radClinicalHistory').value.trim(),
      technique: document.getElementById('radTechnique').value.trim(),
      findings: document.getElementById('radFindings').value.trim(),
      impression: document.getElementById('radImpression').value.trim(),
      dcmStudyInstanceUID: document.getElementById('radDcmUID').value.trim()
    };

    try {
      const res = await apiRequest('/diagnostics/results/save', {
        method: 'POST',
        body: {
          orderId: currentOrderPayload.order.id,
          specimenBarcode: activeTest.specimenBarcode,
          department: activeTest.department,
          radiologyReport
        }
      });
      alert(res.message || 'Radiology RIS report saved successfully.');
      fetchScanData(currentOrderPayload.order.orderBarcode);
    } catch (err) {
      alert(err.message || 'Failed to save radiology report.');
    }
  });
});
