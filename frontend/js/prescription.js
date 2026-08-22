document.addEventListener('DOMContentLoaded', async () => {
  const rxMedicineTableBody = document.getElementById('rxMedicineTableBody');
  const addMedicineRowBtn = document.getElementById('addMedicineRowBtn');
  const submitPrescriptionBtn = document.getElementById('submitPrescriptionBtn');
  const rxAlert = document.getElementById('rxAlert');

  let rxPatientSearch = null;
  let rxDoctorSearch = null;
  let currentAppointmentId = null;

  function showAlert(msg, isErr = true) {
    rxAlert.classList.remove('d-none', 'alert-danger', 'alert-success');
    rxAlert.classList.add(isErr ? 'alert-danger' : 'alert-success');
    rxAlert.textContent = msg;
  }

  // Add Medicine Row
  function addMedicineRow(generic = '', brand = '', dosage = '500mg', frequency = '1-0-1', duration = '5 days') {
    const row = `
      <tr>
        <td class="ps-3"><input type="text" class="form-control form-control-sm rx-generic" value="${generic}" placeholder="Paracetamol" required /></td>
        <td><input type="text" class="form-control form-control-sm rx-brand" value="${brand}" placeholder="Napa Extra" /></td>
        <td><input type="text" class="form-control form-control-sm rx-dosage" value="${dosage}" placeholder="500mg" /></td>
        <td><input type="text" class="form-control form-control-sm rx-frequency" value="${frequency}" placeholder="1-0-1" /></td>
        <td><input type="text" class="form-control form-control-sm rx-duration" value="${duration}" placeholder="5 days" /></td>
        <td class="text-end pe-3"><button type="button" class="btn btn-sm btn-outline-danger remove-row-btn"><i class="bi bi-trash"></i></button></td>
      </tr>
    `;
    rxMedicineTableBody.insertAdjacentHTML('beforeend', row);
    rxMedicineTableBody.lastElementChild.querySelector('.remove-row-btn').addEventListener('click', (e) => {
      e.currentTarget.closest('tr').remove();
    });
  }

  // Load Selectors
  try {
    const patRes = await apiRequest('/patients');
    const pats = patRes.data || patRes;
    const patMount = document.getElementById('rxPatientSearchMount');
    if (patMount && typeof mountSearchSelect === 'function') {
      rxPatientSearch = mountSearchSelect(patMount, {
        items: pats,
        placeholder: 'Search patient by name, UHID, or phone...',
        size: 'sm',
        required: true,
        getLabel: (p) => `${p.fullName || p.name} (${p.uhid || p.id})`,
        getSubLabel: (p) => `Mobile: ${p.phone || 'N/A'}`,
        getValue: (p) => p.id
      });
    }

    const docRes = await apiRequest('/doctors');
    const docs = docRes.data || docRes;
    const docMount = document.getElementById('rxDoctorSearchMount');
    if (docMount && typeof mountSearchSelect === 'function') {
      rxDoctorSearch = mountSearchSelect(docMount, {
        items: docs,
        placeholder: 'Search doctor by name or specialty...',
        size: 'sm',
        required: true,
        getLabel: (d) => (d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`),
        getSubLabel: (d) => `${d.specialization || d.department || 'General'}`,
        getValue: (d) => d.id
      });
    }
  } catch (err) {
    showAlert('Failed to load patient/doctor options: ' + err.message);
  }

  // Initial Rows
  addMedicineRow('Paracetamol', 'Napa Extra 500mg', '500mg', '1-1-1', '5 days');
  addMedicineRow('Amlodipine', 'Amdocal 5mg', '5mg', '0-0-1', '30 days');

  addMedicineRowBtn.addEventListener('click', () => addMedicineRow());

  // OPD Appointment Queue Auto-Load Handler
  async function loadOpdAppointment(aptIdOrNumber) {
    if (!aptIdOrNumber) return;
    try {
      const res = await apiRequest(`/opd/appointments/${encodeURIComponent(aptIdOrNumber)}`);
      const apt = res.data || res;
      if (!apt || !apt.id) {
        showAlert(`OPD Appointment #${aptIdOrNumber} not found.`);
        return;
      }

      currentAppointmentId = apt.id;
      if (rxPatientSearch) rxPatientSearch.setValue(apt.patientId);
      if (rxDoctorSearch) rxDoctorSearch.setValue(apt.doctorId);

      let symptomsText = apt.notes || '';
      if (apt.vitals && (apt.vitals.bp || apt.vitals.temperature || apt.vitals.pulse)) {
        const vitalsArr = [];
        if (apt.vitals.bp) vitalsArr.push(`BP: ${apt.vitals.bp}`);
        if (apt.vitals.pulse) vitalsArr.push(`Pulse: ${apt.vitals.pulse}`);
        if (apt.vitals.temperature) vitalsArr.push(`Temp: ${apt.vitals.temperature}°F`);
        if (apt.vitals.spo2) vitalsArr.push(`SpO2: ${apt.vitals.spo2}%`);
        if (apt.vitals.weight) vitalsArr.push(`Weight: ${apt.vitals.weight}kg`);
        symptomsText += (symptomsText ? ' | ' : '') + `Nurse Triage Vitals: [${vitalsArr.join(', ')}]`;
      }
      if (symptomsText) {
        document.getElementById('rxSymptoms').value = symptomsText;
      }

      // Update OPD Appointment Status to in_consultation (Attending Patient)
      try {
        await apiRequest(`/opd/appointments/${apt.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'in_consultation' })
        });
      } catch (statusErr) {
        console.warn('Could not auto-update status to in_consultation:', statusErr);
      }

      showAlert(`Loaded OPD Appointment #${apt.appointmentNumber} (Token #${apt.tokenNumber}). Queue status changed to "In Consultation".`, false);
    } catch (err) {
      showAlert('Failed to load OPD appointment: ' + err.message);
    }
  }

  const opdInput = document.getElementById('opdAppointmentLookupInput');
  const loadOpdBtn = document.getElementById('loadOpdAppointmentBtn');

  loadOpdBtn?.addEventListener('click', () => {
    const val = opdInput?.value.trim();
    if (!val) {
      showAlert('Please enter an OPD Appointment Number or Token ID.');
      return;
    }
    loadOpdAppointment(val);
  });

  opdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = opdInput?.value.trim();
      if (val) loadOpdAppointment(val);
    }
  });

  // Auto-load if appointmentId is passed in URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialAptId = urlParams.get('appointmentId') || urlParams.get('apt');
  if (initialAptId) {
    if (opdInput) opdInput.value = initialAptId;
    loadOpdAppointment(initialAptId);
  }

  // Form Submit
  submitPrescriptionBtn.addEventListener('click', async () => {
    const patientId = rxPatientSearch ? rxPatientSearch.getValue() : '';
    const doctorId = rxDoctorSearch ? rxDoctorSearch.getValue() : '';
    const diagnosis = document.getElementById('rxDiagnosis').value;
    const symptoms = document.getElementById('rxSymptoms').value;
    const nextFollowUpDate = document.getElementById('rxFollowUpDate').value;
    const clinicalNotes = document.getElementById('rxClinicalNotes').value;

    if (!patientId || !doctorId || !diagnosis) {
      showAlert('Please select Patient, Doctor, and enter Clinical Diagnosis.');
      return;
    }

    const selectedDocObj = rxDoctorSearch ? rxDoctorSearch.getSelectedItem() : null;
    const selectedDoc = selectedDocObj ? (selectedDocObj.name.startsWith('Dr.') ? selectedDocObj.name : `Dr. ${selectedDocObj.name}`) : '';

    const medicines = [];
    document.querySelectorAll('#rxMedicineTableBody tr').forEach((tr) => {
      const genericName = tr.querySelector('.rx-generic')?.value || '';
      const brandName = tr.querySelector('.rx-brand')?.value || '';
      const dosage = tr.querySelector('.rx-dosage')?.value || '';
      const frequency = tr.querySelector('.rx-frequency')?.value || '';
      const duration = tr.querySelector('.rx-duration')?.value || '';

      if (genericName) {
        medicines.push({ genericName, brandName, dosage, frequency, duration });
      }
    });

    const testsRecommended = [];
    document.querySelectorAll('.test-check:checked').forEach((chk) => {
      testsRecommended.push(chk.value);
    });

    try {
      const res = await apiRequest('/emr/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: currentAppointmentId,
          patientId,
          doctorId,
          doctorName: selectedDoc,
          diagnosis,
          symptoms,
          medicines,
          testsRecommended,
          clinicalNotes,
          nextFollowUpDate
        })
      });

      const rx = res.data || res;
      showAlert(`Prescription #${rx.prescriptionNumber} generated successfully!`, false);

      // Store created prescription for re-printing
      let lastGeneratedRx = rx;

      // Update Modal
      const modalRxNumber = document.getElementById('modalRxNumber');
      if (modalRxNumber) modalRxNumber.textContent = `Prescription #${rx.prescriptionNumber}`;

      const printModalBtn = document.getElementById('printRxModalBtn');
      if (printModalBtn) {
        printModalBtn.onclick = () => printPrescription(lastGeneratedRx);
      }

      const viewEmrBtn = document.getElementById('viewEmrModalBtn');
      if (viewEmrBtn) {
        viewEmrBtn.onclick = () => {
          window.location.href = `emr.html?uhid=${rx.uhid || rx.patientId}`;
        };
      }

      // Show Success Modal
      const modalEl = document.getElementById('prescriptionSuccessModal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }

      // Automatically trigger print dialog
      printPrescription(rx);
    } catch (err) {
      showAlert('Failed to generate prescription: ' + err.message);
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function printPrescription(rx) {
    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (!printWin) {
      showAlert('Print popup blocked by browser. Please allow popups to auto-print.', true);
      return;
    }

    const createdDate = rx.createdAt
      ? new Date(rx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const medicinesRows = (rx.medicines || [])
      .map(
        (m, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef;">
          <strong style="font-size: 14px;">${idx + 1}. ${escapeHtml(m.brandName || m.genericName)}</strong>
          ${m.brandName && m.genericName ? `<br><small style="color: #6c757d;">Generic: ${escapeHtml(m.genericName)}</small>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${escapeHtml(m.dosage || '-')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${escapeHtml(m.frequency || '-')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${escapeHtml(m.duration || '-')}</td>
      </tr>
    `
      )
      .join('');

    const testsList = (rx.testsRecommended || [])
      .map((t) => `<li style="margin-bottom: 6px;">${escapeHtml(t)}</li>`)
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription #${escapeHtml(rx.prescriptionNumber)}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #212529; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #0d6efd; padding-bottom: 15px; margin-bottom: 20px; }
          .header h2 { margin: 0; color: #0d6efd; text-transform: uppercase; font-size: 22px; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0 0; font-size: 12px; color: #6c757d; }
          .rx-badge { display: inline-block; background: #e7f1ff; color: #0d6efd; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; margin-top: 10px; border: 1px solid #b6d4fe; }
          .patient-box { display: flex; justify-content: space-between; background: #f8f9fa; padding: 14px 18px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; border: 1px solid #dee2e6; }
          .section-heading { font-size: 13px; font-weight: bold; color: #0d6efd; text-transform: uppercase; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; }
          .rx-symbol { font-size: 32px; font-weight: bold; color: #0d6efd; font-family: Georgia, serif; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #f1f3f5; color: #495057; text-align: left; padding: 10px; font-weight: 600; border-bottom: 2px solid #dee2e6; }
          .advice-box { background: #fff9db; padding: 12px 15px; border-radius: 6px; border-left: 4px solid #fcc419; font-size: 13px; margin-bottom: 20px; }
          .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #6c757d; }
          .sig-box { text-align: center; border-top: 1px solid #495057; width: 200px; padding-top: 6px; }
          @media print {
            body { padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body onload="window.print();">
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print();" style="padding: 8px 18px; background: #0d6efd; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
            🖨️ Print Prescription
          </button>
        </div>

        <div class="header">
          <h2>Hospital ERP — Electronic Health Record</h2>
          <p>Outpatient Department (OPD) & Specialty Clinics | Care Line: +880 1700-000000</p>
          <div class="rx-badge">Prescription #${escapeHtml(rx.prescriptionNumber)}</div>
        </div>

        <div class="patient-box">
          <div>
            <div><strong>Patient Name:</strong> ${escapeHtml(rx.patientName || 'N/A')}</div>
            <div><strong>UHID:</strong> ${escapeHtml(rx.uhid || 'N/A')}</div>
            <div><strong>Age / Gender:</strong> ${escapeHtml(rx.patientAge || 'N/A')} / ${escapeHtml(rx.patientGender || 'N/A')}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Attending Doctor:</strong> ${escapeHtml(rx.doctorName || 'Attending Physician')}</div>
            <div><strong>Date:</strong> ${createdDate}</div>
            <div><strong>Diagnosis:</strong> ${escapeHtml(rx.diagnosis || 'General Consultation')}</div>
          </div>
        </div>

        ${rx.symptoms ? `<div style="font-size: 13px; margin-bottom: 15px;"><strong>Chief Symptoms:</strong> ${escapeHtml(rx.symptoms)}</div>` : ''}

        <div class="rx-symbol">℞</div>

        ${
          rx.medicines && rx.medicines.length
            ? `
          <table>
            <thead>
              <tr>
                <th style="width: 45%;">Medicine & Generic Name</th>
                <th style="width: 15%; text-align: center;">Dosage</th>
                <th style="width: 20%; text-align: center;">Frequency</th>
                <th style="width: 20%; text-align: center;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${medicinesRows}
            </tbody>
          </table>
        `
            : '<p style="font-size: 13px; color: #6c757d;">No medicines prescribed.</p>'
        }

        ${
          rx.testsRecommended && rx.testsRecommended.length
            ? `
          <div class="section-heading">Recommended Diagnostic Investigations</div>
          <ul style="font-size: 13px; padding-left: 20px; margin-top: 5px;">
            ${testsList}
          </ul>
        `
            : ''
        }

        ${
          rx.clinicalNotes
            ? `
          <div class="section-heading">Clinical Advice & Instructions</div>
          <div class="advice-box">
            ${escapeHtml(rx.clinicalNotes)}
          </div>
        `
            : ''
        }

        ${rx.nextFollowUpDate ? `<div style="font-size: 13px; margin-top: 15px;"><strong>Next Follow-up Date:</strong> ${escapeHtml(rx.nextFollowUpDate)}</div>` : ''}

        <div class="footer">
          <div>Generated via Electronic Health Records System</div>
          <div class="sig-box">
            <strong>${escapeHtml(rx.doctorName || 'Attending Physician')}</strong><br>
            Doctor Signature
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  }
});
