document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/payments.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Payments';

  const alertBox = document.getElementById('paymentAlert');
  const successBox = document.getElementById('paymentSuccess');
  const form = document.getElementById('paymentForm');

  let customers = [];
  let suppliers = [];
  let payments = [];
  let partySearch;
  let paymentDateFrom = '';
  let paymentDateTo = '';

  function showError(err) {
    successBox.classList.add('d-none');
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }
  function showSuccess(msg) {
    alertBox.classList.add('d-none');
    successBox.textContent = msg;
    successBox.classList.remove('d-none');
  }
  function formatMoney(n) {
    return '৳' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function toLocalDatetimeValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  document.getElementById('paymentDate').value = toLocalDatetimeValue();

  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
      if (btn.dataset.tab === 'listTab') loadPayments();
    });
  });

  function mountPartySearch() {
    const partyType = document.getElementById('partyType').value;
    document.getElementById('partyLabel').textContent = partyType;
    partySearch?.destroy();
    const items = partyType === 'Customer' ? customers : suppliers;
    partySearch = mountSearchSelect(document.getElementById('partySearchMount'), {
      items,
      placeholder: `Search ${partyType.toLowerCase()}...`,
      required: true,
      getLabel: (p) => p.name,
      getValue: (p) => p.id,
      getSubLabel: (p) => [p.phone, p.email].filter(Boolean).join(' · ')
    });
  }

  document.getElementById('partyType').addEventListener('change', mountPartySearch);

  async function loadLookups() {
    const [custRes, supRes] = await Promise.all([
      apiRequest('/customers?status=Active'),
      apiRequest('/suppliers?status=Active')
    ]);
    customers = custRes.data;
    suppliers = supRes.data;
    mountPartySearch();
  }

  async function loadPayments() {
    const res = await apiRequest('/payments');
    payments = res.data;
    renderPaymentTable();
  }

  function renderPaymentTable() {
    const body = document.getElementById('paymentTableBody');
    const summaryEl = document.getElementById('paymentDateSummary');
    const filtered = payments.filter((p) => isDateInRange(p.paymentDate, paymentDateFrom, paymentDateTo));

    if (paymentDateFrom || paymentDateTo) {
      const received = filtered.filter((p) => p.direction === 'Received');
      const paid = filtered.filter((p) => p.direction === 'Paid');
      const receivedTotal = received.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidTotal = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const range = formatRangeLabel(paymentDateFrom, paymentDateTo);
      summaryEl.innerHTML =
        `<strong>${received.length}</strong> received (${formatMoney(receivedTotal)})` +
        ` &mdash; <strong>${paid.length}</strong> paid (${formatMoney(paidTotal)})` +
        ` <span class="text-muted">(${range})</span>`;
      summaryEl.classList.remove('d-none');
    } else {
      summaryEl.classList.add('d-none');
    }

    if (!filtered.length) {
      const msg = payments.length
        ? 'No payments in this date range.'
        : 'No payments yet.';
      body.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">${msg}</td></tr>`;
      return;
    }

    body.innerHTML = filtered
      .map((p) => {
        const party =
          p.partyType === 'Customer'
            ? customers.find((c) => c.id === p.partyId)?.name || p.partyId
            : suppliers.find((s) => s.id === p.partyId)?.name || p.partyId;
        return `
      <tr>
        <td><code>${p.id}</code></td>
        <td>${new Date(p.paymentDate).toLocaleString()}</td>
        <td>${p.partyType}: ${party}</td>
        <td class="${p.direction === 'Received' ? 'text-success' : 'text-danger'}">${p.direction}</td>
        <td>${formatMoney(p.amount)}</td>
        <td>${p.paymentMethod}</td>
      </tr>`;
      })
      .join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');
    const partyType = document.getElementById('partyType').value;
    const partyId = partySearch.getValue();
    if (!partyId) {
      showError(new Error(`Select a ${partyType.toLowerCase()}.`));
      return;
    }
    const paymentDateRaw = document.getElementById('paymentDate').value;
    const payload = {
      partyType,
      partyId,
      direction: partyType === 'Customer' ? 'Received' : 'Paid',
      amount: parseFloat(document.getElementById('amount').value),
      paymentMethod: document.getElementById('paymentMethod').value,
      paymentDate: paymentDateRaw ? new Date(paymentDateRaw).toISOString() : undefined,
      note: document.getElementById('note').value.trim()
    };
    try {
      const res = await apiRequest('/payments', { method: 'POST', body: payload });
      showSuccess(`Payment recorded: ${res.data.id} — ${formatMoney(res.data.amount)}`);
      form.reset();
      document.getElementById('paymentDate').value = toLocalDatetimeValue();
      partySearch.clear();
    } catch (err) {
      showError(err);
    }
  });

  try {
    bindDateRangeFilter('paymentDateFrom', 'paymentDateTo', 'paymentDateClear', (from, to) => {
      paymentDateFrom = from;
      paymentDateTo = to;
      renderPaymentTable();
    });
    await loadLookups();
  } catch (err) {
    showError(err);
  }
});
