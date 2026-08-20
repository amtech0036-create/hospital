document.addEventListener('DOMContentLoaded', async () => {
  const rxPatientSelect = document.getElementById('rxPatientSelect');
  const rxDoctorSelect = document.getElementById('rxDoctorSelect');
  const rxMedicineTableBody = document.getElementById('rxMedicineTableBody');
  const addMedicineRowBtn = document.getElementById('addMedicineRowBtn');
  const submitPrescriptionBtn = document.getElementById('submitPrescriptionBtn');
  const rxAlert = document.getElementById('rxAlert');

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
    (patRes.data || patRes).forEach((p) => {
      const opt = `<option value="${p.id}">${p.fullName || p.name} (${p.uhid || p.id})</option>`;
      rxPatientSelect.insertAdjacentHTML('beforeend', opt);
    });

    const docRes = await apiRequest('/doctors');
    (docRes.data || docRes).forEach((d) => {
      const opt = `<option value="${d.id}">Dr. ${d.name} (${d.specialization || 'General'})</option>`;
      rxDoctorSelect.insertAdjacentHTML('beforeend', opt);
    });
  } catch (err) {
    showAlert('Failed to load patient/doctor options: ' + err.message);
  }

  // Initial Rows
  addMedicineRow('Paracetamol', 'Napa Extra 500mg', '500mg', '1-1-1', '5 days');
  addMedicineRow('Amlodipine', 'Amdocal 5mg', '5mg', '0-0-1', '30 days');

  addMedicineRowBtn.addEventListener('click', () => addMedicineRow());

  // Form Submit
  submitPrescriptionBtn.addEventListener('click', async () => {
    const patientId = rxPatientSelect.value;
    const doctorId = rxDoctorSelect.value;
    const diagnosis = document.getElementById('rxDiagnosis').value;
    const symptoms = document.getElementById('rxSymptoms').value;
    const nextFollowUpDate = document.getElementById('rxFollowUpDate').value;
    const clinicalNotes = document.getElementById('rxClinicalNotes').value;

    if (!patientId || !doctorId || !diagnosis) {
      showAlert('Please select Patient, Doctor, and enter Clinical Diagnosis.');
      return;
    }

    const medicines = [];
    document.querySelectorAll('#rxMedicineTableBody tr').forEach((tr) => {
      const genericName = tr.querySelector('.rx-generic').value;
      const brandName = tr.querySelector('.rx-brand').value;
      const dosage = tr.querySelector('.rx-dosage').value;
      const frequency = tr.querySelector('.rx-frequency').value;
      const duration = tr.querySelector('.rx-duration').value;

      if (genericName) {
        medicines.push({ genericName, brandName, dosage, frequency, duration });
      }
    });

    const testsRecommended = [];
    document.querySelectorAll('.test-check:checked').forEach((chk) => {
      testsRecommended.push(chk.value);
    });

    try {
      const selectedDoc = rxDoctorSelect.options[rxDoctorSelect.selectedIndex].text;
      const res = await apiRequest('/emr/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
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
      setTimeout(() => {
        window.location.href = `emr.html?uhid=${rx.uhid}`;
      }, 1500);
    } catch (err) {
      showAlert('Failed to generate prescription: ' + err.message);
    }
  });
});
