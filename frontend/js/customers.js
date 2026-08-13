document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/customers.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Customers';

  const alertBox = document.getElementById('customerAlert');
  const modalEl = document.getElementById('customerModal');
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('customerForm');
  let editingId = null;
  let allCustomers = [];
  let ledgerCustomerSearch;
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
  async function loadCustomers(search = '') {
    try {
      const res = await apiRequest(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      allCustomers = res.data;
      renderTable(allCustomers);
      updateLedgerCustomerSearch(allCustomers);
    } catch (err) {
      showError(err);
    }
  }

  function renderTable(customers) {
    const body = document.getElementById('customerTableBody');
    if (!customers.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No customers yet.</td></tr>';
      return;
    }
    body.innerHTML = customers
      .map(
        (c) => `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone || ''}</td>
        <td>${c.email || ''}</td>
        <td class="${c.balanceDue > 0 ? 'text-danger fw-bold' : ''}">${formatMoney(c.balanceDue)}</td>
        <td><span class="badge ${c.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${c.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-edit="${c.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-remove="${c.id}">Deactivate</button>
          <button class="btn btn-sm btn-danger" data-delete="${c.id}">Delete</button>
        </td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openEdit(btn.dataset.edit)));
    body.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => deactivateCustomer(btn.dataset.remove)));
    body.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deleteCustomerPermanently(btn.dataset.delete)));
  }

  document.getElementById('addBtn').addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
    document.getElementById('c_openingBalanceGroup').classList.remove('d-none');
    modal.show();
  });

  function openEdit(id) {
    const c = allCustomers.find((x) => x.id === id);
    if (!c) return;
    editingId = id;
    document.getElementById('customerModalTitle').textContent = `Edit ${c.name}`;
    document.getElementById('c_name').value = c.name;
    document.getElementById('c_phone').value = c.phone || '';
    document.getElementById('c_email').value = c.email || '';
    document.getElementById('c_address').value = c.address || '';
    // Opening balance only applies at creation, not editing.
    document.getElementById('c_openingBalanceGroup').classList.add('d-none');
    modal.show();
  }

  async function deactivateCustomer(id) {
    if (!confirm('Deactivate this customer?')) return;
    try {
      await apiRequest(`/customers/${id}`, { method: 'DELETE' });
      loadCustomers();
    } catch (err) {
      showError(err);
    }
  }

  async function deleteCustomerPermanently(id) {
    if (!confirm('Permanently delete this customer? This cannot be undone. If it has ledger history, this will be blocked.')) return;
    try {
      await apiRequest(`/customers/${id}/permanent`, { method: 'DELETE' });
      loadCustomers();
    } catch (err) {
      showError(err);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      name: document.getElementById('c_name').value.trim(),
      phone: document.getElementById('c_phone').value.trim(),
      email: document.getElementById('c_email').value.trim(),
      address: document.getElementById('c_address').value.trim()
    };
    if (!editingId) {
      payload.openingBalance = parseFloat(document.getElementById('c_openingBalance').value) || 0;
    }

    try {
      if (editingId) {
        await apiRequest(`/customers/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/customers', { method: 'POST', body: payload });
      }
      modal.hide();
      loadCustomers();
    } catch (err) {
      showError(err);
    }
  });

  let searchTimer = null;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadCustomers(e.target.value.trim()), 300);
  });

  // ---- Ledger tab ----
  function updateLedgerCustomerSearch(customers) {
    const mount = document.getElementById('ledgerCustomerSearchMount');
    if (!ledgerCustomerSearch) {
      ledgerCustomerSearch = mountSearchSelect(mount, {
        items: customers,
        placeholder: 'Search customer by name, phone, email...',
        required: true,
        getLabel: (c) => c.name,
        getValue: (c) => c.id,
        getSubLabel: (c) => [c.phone, c.email].filter(Boolean).join(' · '),
        onSelect: () => loadLedgerHistory()
      });
    } else {
      ledgerCustomerSearch.setItems(customers);
    }
  }

  function renderLedgerHistory() {
    const body = document.getElementById('ledgerHistoryBody');
    const summaryEl = document.getElementById('ledgerDateSummary');
    const filtered = ledgerTransactions.filter((t) =>
      isDateInRange(t.transactionDate, ledgerDateFrom, ledgerDateTo)
    );

    if (ledgerDateFrom || ledgerDateTo) {
      const sales = filtered.filter((t) => t.type === 'Invoice');
      const payments = filtered.filter((t) => t.type === 'Payment Received');
      const salesTotal = sales.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const paymentsTotal = payments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const range = formatRangeLabel(ledgerDateFrom, ledgerDateTo);
      summaryEl.innerHTML =
        `<strong>${sales.length}</strong> sale${sales.length === 1 ? '' : 's'} (${formatMoney(salesTotal)})` +
        ` &mdash; <strong>${payments.length}</strong> payment${payments.length === 1 ? '' : 's'} received (${formatMoney(paymentsTotal)})` +
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
    const customerId = ledgerCustomerSearch?.getValue();
    const body = document.getElementById('ledgerHistoryBody');
    const balanceLabel = document.getElementById('ledgerBalanceLabel');

    if (!customerId) {
      ledgerTransactions = [];
      body.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Select a customer above.</td></tr>';
      balanceLabel.textContent = '';
      document.getElementById('ledgerDateSummary').classList.add('d-none');
      return;
    }

    try {
      const [historyRes, balanceRes] = await Promise.all([
        apiRequest(`/customers/${customerId}/transactions`),
        apiRequest(`/customers/${customerId}/balance`)
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
    const customerId = ledgerCustomerSearch?.getValue();
    if (!customerId) {
      showError({ message: 'Please select a customer first.' });
      return;
    }

    try {
      await apiRequest('/customers/transactions', {
        method: 'POST',
        body: {
          customerId,
          type: document.getElementById('ledgerType').value,
          amount: parseFloat(document.getElementById('ledgerAmount').value),
          note: document.getElementById('ledgerNote').value.trim()
        }
      });
      document.getElementById('ledgerAmount').value = '';
      document.getElementById('ledgerNote').value = '';
      loadLedgerHistory();
      loadCustomers();
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
  loadCustomers();
});
