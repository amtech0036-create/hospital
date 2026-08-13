document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/expenses.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Expenses';

  const alertBox = document.getElementById('expenseAlert');
  const successBox = document.getElementById('expenseSuccess');
  const form = document.getElementById('expenseForm');

  const CATEGORIES = [
    'Daily Lunch Bill',
    'Snacks Bill',
    'Office Rent',
    'Kitchen Items Buying Bill',
    'Others'
  ];

  let expenses = [];
  let expenseDateFrom = '';
  let expenseDateTo = '';

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

  document.getElementById('expenseDate').value = toLocalDatetimeValue();

  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
      if (btn.dataset.tab === 'listTab') loadExpenses();
    });
  });

  async function loadExpenses() {
    const res = await apiRequest('/expenses');
    expenses = res.data;
    renderExpenseTable();
  }

  function renderExpenseTable() {
    const body = document.getElementById('expenseTableBody');
    const summaryEl = document.getElementById('expenseDateSummary');
    const filtered = expenses.filter((e) => isDateInRange(e.expenseDate, expenseDateFrom, expenseDateTo));

    if (expenseDateFrom || expenseDateTo) {
      const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const range = formatRangeLabel(expenseDateFrom, expenseDateTo);
      const breakdown = CATEGORIES.map((cat) => {
        const items = filtered.filter((e) => e.category === cat);
        if (!items.length) return null;
        const catTotal = items.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return `${items.length} ${cat} (${formatMoney(catTotal)})`;
      })
        .filter(Boolean)
        .join(' · ');
      summaryEl.innerHTML =
        `<strong>${filtered.length}</strong> expense${filtered.length === 1 ? '' : 's'} — Total: <strong>${formatMoney(totalAmount)}</strong>` +
        (breakdown ? `<br><span class="text-muted">${breakdown} (${range})</span>` : ` <span class="text-muted">(${range})</span>`);
      summaryEl.classList.remove('d-none');
    } else {
      summaryEl.classList.add('d-none');
    }

    if (!filtered.length) {
      const msg = expenses.length ? 'No expenses in this date range.' : 'No expenses yet.';
      body.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">${msg}</td></tr>`;
      return;
    }

    body.innerHTML = filtered
      .map(
        (e) => `
      <tr>
        <td><code>${e.id}</code></td>
        <td>${new Date(e.expenseDate).toLocaleString()}</td>
        <td>${e.category}</td>
        <td>${formatMoney(e.amount)}</td>
        <td>${e.paymentMethod}</td>
        <td>${e.note || ''}</td>
      </tr>`
      )
      .join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');

    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value.trim();
    if (category === 'Others' && !note) {
      showError(new Error('Please add a note describing this expense when category is Others.'));
      return;
    }

    const expenseDateRaw = document.getElementById('expenseDate').value;
    const payload = {
      category,
      amount: parseFloat(document.getElementById('amount').value),
      paymentMethod: document.getElementById('paymentMethod').value,
      expenseDate: expenseDateRaw ? new Date(expenseDateRaw).toISOString() : undefined,
      note
    };

    try {
      const res = await apiRequest('/expenses', { method: 'POST', body: payload });
      showSuccess(`Expense recorded: ${res.data.id} — ${formatMoney(res.data.amount)} (${res.data.category})`);
      form.reset();
      document.getElementById('expenseDate').value = toLocalDatetimeValue();
    } catch (err) {
      showError(err);
    }
  });

  bindDateRangeFilter('expenseDateFrom', 'expenseDateTo', 'expenseDateClear', (from, to) => {
    expenseDateFrom = from;
    expenseDateTo = to;
    renderExpenseTable();
  });
});
