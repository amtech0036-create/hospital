/**
 * Renders a simple "list + add/edit modal" page for a lookup table
 * (Categories, Brands, Units). Each page's HTML just needs:
 *   <div id="lookupAlert"></div>
 *   <table><tbody id="lookupTableBody"></tbody></table>
 *   <button id="addBtn">Add</button>
 *   a Bootstrap modal with id="lookupModal" containing #lookupForm,
 *   #lookupName, #lookupDescription (or #lookupShortName for Units)
 *
 * Config is passed in per page (see categories.html / brands.html / units.html).
 */
function initLookupPage({ apiPath, entityLabel, extraField }) {
  const alertBox = document.getElementById('lookupAlert');
  const tableBody = document.getElementById('lookupTableBody');
  const form = document.getElementById('lookupForm');
  const modalEl = document.getElementById('lookupModal');
  const modal = new bootstrap.Modal(modalEl);
  const modalTitle = document.getElementById('lookupModalTitle');
  let editingId = null;

  function showError(err) {
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }

  function clearError() {
    alertBox.classList.add('d-none');
  }

  async function load() {
    try {
      const res = await apiRequest(`${apiPath}`);
      renderTable(res.data);
    } catch (err) {
      showError(err);
    }
  }

  function renderTable(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-4">No ${entityLabel.toLowerCase()}s yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map(
        (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${extraField ? item[extraField.key] || '' : item.description || ''}</td>
          <td><span class="badge ${item.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${item.status}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" data-edit="${item.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-deactivate="${item.id}">Deactivate</button>
          </td>
        </tr>`
      )
      .join('');

    tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEdit(btn.dataset.edit, items));
    });
    tableBody.querySelectorAll('[data-deactivate]').forEach((btn) => {
      btn.addEventListener('click', () => deactivate(btn.dataset.deactivate));
    });
  }

  function openCreate() {
    editingId = null;
    modalTitle.textContent = `Add ${entityLabel}`;
    form.reset();
    modal.show();
  }

  function openEdit(id, items) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    editingId = id;
    modalTitle.textContent = `Edit ${entityLabel}`;
    document.getElementById('lookupName').value = item.name;
    if (extraField) {
      document.getElementById(extraField.inputId).value = item[extraField.key] || '';
    } else {
      document.getElementById('lookupDescription').value = item.description || '';
    }
    modal.show();
  }

  async function deactivate(id) {
    if (!confirm(`Deactivate this ${entityLabel.toLowerCase()}?`)) return;
    try {
      await apiRequest(`${apiPath}/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      showError(err);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const payload = { name: document.getElementById('lookupName').value.trim() };
    if (extraField) {
      payload[extraField.key] = document.getElementById(extraField.inputId).value.trim();
    } else {
      payload.description = document.getElementById('lookupDescription').value.trim();
    }

    try {
      if (editingId) {
        await apiRequest(`${apiPath}/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest(`${apiPath}`, { method: 'POST', body: payload });
      }
      modal.hide();
      load();
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('addBtn').addEventListener('click', openCreate);

  load();
}
