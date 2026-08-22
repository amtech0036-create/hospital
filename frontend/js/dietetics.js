let selectedDietPatient = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/dietetics.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Nutrition & Dietetics Ward Schedules';

  initDietSearch();
  loadDietPlans();

  document.getElementById('btnRefreshDiet').addEventListener('click', loadDietPlans);
  document.getElementById('btnSaveDiet').addEventListener('click', saveDietPlan);
});

function initDietSearch() {
  new SearchComponent('#dietSearchContainer', {
    endpoint: '/api/dietetics',
    placeholder: 'Search Diet Plans by UHID, Patient Name, Diet Type...',
    onSelect: (item) => {
      loadDietPlans(item.uhid);
    }
  });

  new SearchComponent('#dietModalPatientSearch', {
    endpoint: '/api/patients',
    placeholder: 'Search patient for diet assignment...',
    onSelect: (patient) => {
      selectedDietPatient = patient;
    }
  });
}

async function loadDietPlans(searchQuery = '') {
  const tbody = document.getElementById('dietTableBody');
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading diet plans...</td></tr>`;

    let url = `/api/dietetics?limit=50`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    const res = await apiFetch(url);
    const diets = res.data || [];

    if (!diets.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No active diet plans assigned.</td></tr>`;
      return;
    }

    tbody.innerHTML = diets.map(item => `
      <tr>
        <td>
          <div class="fw-bold text-dark">${item.patientName}</div>
          <div class="small text-muted">UHID: ${item.uhid || 'N/A'}</div>
        </td>
        <td><span class="badge bg-warning-subtle text-dark border border-warning">${item.dietPlanType}</span></td>
        <td class="small text-muted">${item.mealSchedule || 'Standard Ward Schedule'}</td>
        <td class="small text-danger fw-semibold">${item.allergiesDiet || 'None'}</td>
        <td class="small">${item.dieticianName}</td>
        <td><span class="badge bg-success-subtle text-success border border-success">${item.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load diet plans:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load dietetics data.</td></tr>`;
  }
}

async function saveDietPlan() {
  if (!selectedDietPatient) {
    alert('Please select a patient using the Search-First input.');
    return;
  }

  const payload = {
    patientId: selectedDietPatient.id,
    uhid: selectedDietPatient.uhid,
    patientName: selectedDietPatient.fullName,
    dietPlanType: document.getElementById('dietType').value.trim(),
    dieticianName: document.getElementById('dietDietician').value.trim(),
    mealSchedule: document.getElementById('dietSchedule').value.trim(),
    allergiesDiet: document.getElementById('dietAllergies').value.trim()
  };

  try {
    const res = await apiFetch('/api/dietetics', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      const modalEl = document.getElementById('newDietModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      document.getElementById('dietForm').reset();
      selectedDietPatient = null;
      loadDietPlans();
    } else {
      alert(res.message || 'Failed to assign diet plan.');
    }
  } catch (err) {
    console.error('Error saving diet plan:', err);
    alert('Failed to connect to dietetics endpoint.');
  }
}
