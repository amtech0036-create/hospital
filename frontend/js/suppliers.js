document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/suppliers.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Suppliers';

  const alertBox = document.getElementById('supplierAlert');
  const modalEl = document.getElementById('supplierModal');
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('supplierForm');
  let editingId = null;
  let allSuppliers = [];
  let ledgerSupplierSearch;
  let ledgerTransactions = [];
  let ledgerDateFrom = '';
  let ledgerDateTo = '';

  function showError(err) {
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }
  function clearError() {
    alertBox.classList.add('d-none');
  }
  function formatMoney(n) {
    return '৳' + Number(n || 0).toLocaleString();
  }

  // ---- Tabs ----
  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
    });
  });

  // ---- List ----
  async function loadSuppliers(search = '') {
    try {
      const res = await apiRequest(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      allSuppliers = res.data;
      renderTable(allSuppliers);
      updateLedgerSupplierSearch(allSuppliers);
    } catch (err) {
      showError(err);
    }
  }

  function renderTable(suppliers) {
    const body = document.getElementById('supplierTableBody');
    if (!suppliers.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No suppliers yet.</td></tr>';
      return;
    }
    body.innerHTML = suppliers
      .map(
        (s) => `
      <tr>
        <td>${s.name}</td>
        <td>${s.phone || ''}</td>
        <td>${s.email || ''}</td>
        <td class="${s.balanceDue > 0 ? 'text-danger fw-bold' : ''}">${formatMoney(s.balanceDue)}</td>
        <td><span class="badge ${s.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${s.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-edit="${s.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-remove="${s.id}">Deactivate</button>
          <button class="btn btn-sm btn-danger" data-delete="${s.id}">Delete</button>
        </td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openEdit(btn.dataset.edit)));
    body.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => deactivateSupplier(btn.dataset.remove)));
    body.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deleteSupplierPermanently(btn.dataset.delete)));
  }

  document.getElementById('addBtn').addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
    document.getElementById('s_openingBalanceGroup').classList.remove('d-none');
    modal.show();
  });

  function openEdit(id) {
    const s = allSuppliers.find((x) => x.id === id);
    if (!s) return;
    editingId = id;
    document.getElementById('supplierModalTitle').textContent = `Edit ${s.name}`;
    document.getElementById('s_name').value = s.name;
    document.getElementById('s_phone').value = s.phone || '';
    document.getElementById('s_email').value = s.email || '';
    document.getElementById('s_address').value = s.address || '';
    // Opening balance only applies at creation, not editing.
    document.getElementById('s_openingBalanceGroup').classList.add('d-none');
    modal.show();
  }

  async function deactivateSupplier(id) {
    if (!confirm('Deactivate this supplier?')) return;
    try {
      await apiRequest(`/suppliers/${id}`, { method: 'DELETE' });
      loadSuppliers();
    } catch (err) {
      showError(err);
    }
  }

  async function deleteSupplierPermanently(id) {
    if (!confirm('Permanently delete this supplier? This cannot be undone. If it has ledger history, this will be blocked.')) return;
    try {
      await apiRequest(`/suppliers/${id}/permanent`, { method: 'DELETE' });
      loadSuppliers();
    } catch (err) {
      showError(err);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      name: document.getElementById('s_name').value.trim(),
      phone: document.getElementById('s_phone').value.trim(),
      email: document.getElementById('s_email').value.trim(),
      address: document.getElementById('s_address').value.trim()
    };
    if (!editingId) {
      payload.openingBalance = parseFloat(document.getElementById('s_openingBalance').value) || 0;
    }

    try {
      if (editingId) {
        await apiRequest(`/suppliers/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/suppliers', { method: 'POST', body: payload });
      }
      modal.hide();
      loadSuppliers();
    } catch (err) {
      showError(err);
    }
  });

  let searchTimer = null;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadSuppliers(e.target.value.trim()), 300);
  });

  // ---- Ledger tab ----
  function updateLedgerSupplierSearch(suppliers) {
    const mount = document.getElementById('ledgerSupplierSearchMount');
    if (!ledgerSupplierSearch) {
      ledgerSupplierSearch = mountSearchSelect(mount, {
        items: suppliers,
        placeholder: 'Search supplier by name, phone, email...',
        required: true,
        getLabel: (s) => s.name,
        getValue: (s) => s.id,
        getSubLabel: (s) => [s.phone, s.email].filter(Boolean).join(' · '),
        onSelect: () => loadLedgerHistory()
      });
    } else {
      ledgerSupplierSearch.setItems(suppliers);
    }
  }

  function renderLedgerHistory() {
    const body = document.getElementById('ledgerHistoryBody');
    const summaryEl = document.getElementById('ledgerDateSummary');
    const filtered = ledgerTransactions.filter((t) =>
      isDateInRange(t.transactionDate, ledgerDateFrom, ledgerDateTo)
    );

    if (ledgerDateFrom || ledgerDateTo) {
      const purchases = filtered.filter((t) => t.type === 'Purchase');
      const payments = filtered.filter((t) => t.type === 'Payment Made');
      const purchasesTotal = purchases.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const paymentsTotal = payments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const range = formatRangeLabel(ledgerDateFrom, ledgerDateTo);
      summaryEl.innerHTML =
        `<strong>${purchases.length}</strong> purchase${purchases.length === 1 ? '' : 's'} (${formatMoney(purchasesTotal)})` +
        ` &mdash; <strong>${payments.length}</strong> payment${payments.length === 1 ? '' : 's'} made (${formatMoney(paymentsTotal)})` +
        ` <span class="text-muted">(${range})</span>`;
      summaryEl.classList.remove('d-none');
    } else {
      summaryEl.classList.add('d-none');
    }

    if (!filtered.length) {
      const msg = ledgerTransactions.length
        ? 'No transactions in this date range.'
        : 'No transactions yet.';
      body.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">${msg}</td></tr>`;
      return;
    }

    body.innerHTML = filtered
      .map(
        (t) => `
        <tr>
          <td>${new Date(t.transactionDate).toLocaleString()}</td>
          <td>${t.type}</td>
          <td>${formatMoney(t.amount)}</td>
          <td>${t.note || ''}</td>
        </tr>`
      )
      .join('');
  }

  async function loadLedgerHistory() {
    const supplierId = ledgerSupplierSearch?.getValue();
    const body = document.getElementById('ledgerHistoryBody');
    const balanceLabel = document.getElementById('ledgerBalanceLabel');

    if (!supplierId) {
      ledgerTransactions = [];
      body.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Select a supplier above.</td></tr>';
      balanceLabel.textContent = '';
      document.getElementById('ledgerDateSummary').classList.add('d-none');
      return;
    }

    try {
      const [historyRes, balanceRes] = await Promise.all([
        apiRequest(`/suppliers/${supplierId}/transactions`),
        apiRequest(`/suppliers/${supplierId}/balance`)
      ]);

      balanceLabel.textContent = `Balance Due: ${formatMoney(balanceRes.data.balanceDue)}`;
      ledgerTransactions = historyRes.data;
      renderLedgerHistory();
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('ledgerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const supplierId = ledgerSupplierSearch?.getValue();
    if (!supplierId) {
      showError({ message: 'Please select a supplier first.' });
      return;
    }

    try {
      await apiRequest('/suppliers/transactions', {
        method: 'POST',
        body: {
          supplierId,
          type: document.getElementById('ledgerType').value,
          amount: parseFloat(document.getElementById('ledgerAmount').value),
          note: document.getElementById('ledgerNote').value.trim()
        }
      });
      document.getElementById('ledgerAmount').value = '';
      document.getElementById('ledgerNote').value = '';
      loadLedgerHistory();
      loadSuppliers();
    } catch (err) {
      showError(err);
    }
  });

  // ---- Init ----
  bindDateRangeFilter('ledgerDateFrom', 'ledgerDateTo', 'ledgerDateClear', (from, to) => {
    ledgerDateFrom = from;
    ledgerDateTo = to;
    renderLedgerHistory();
  });
  loadSuppliers();
});
