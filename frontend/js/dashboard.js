document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/dashboard.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Dashboard';

  const alertBox = document.getElementById('dashboardAlert');

  try {
    const res = await apiRequest('/dashboard/summary');
    renderStatCards(res.data);
    renderLowStock(res.data.lowStockProducts);
    renderRecentPayments(res.data.recentPayments);
    renderCustomersWithNoPayments(res.data.customersWithNoPaymentsIn30Days);
  } catch (err) {
    alertBox.textContent = err.message || 'Failed to load dashboard.';
    alertBox.classList.remove('d-none');
    if (err.status === 401) {
      clearSession();
      window.location.href = '/login.html';
    }
  }
});

function renderStatCards(summary) {
  const cards = [
    { label: "Today's Sales", value: summary.todaysSales },
    { label: "Today's Collection", value: summary.todaysCollection },
    { label: "Today's Purchases", value: summary.todaysPurchases },
    { label: 'Customer Due', value: summary.customerDue },
    { label: 'Supplier Due', value: summary.supplierDue },
    { label: 'Current Stock Value', value: summary.currentStockValue },
    { label: 'Gross Profit', value: summary.grossProfit },
    { label: 'Net Profit', value: summary.netProfit },
    { label: 'Total Products', value: summary.totalProducts },
    { label: 'Total Customers', value: summary.totalCustomers },
    { label: 'Total Suppliers', value: summary.totalSuppliers },
    { label: 'Total Employees', value: summary.totalEmployees }
  ];

  const container = document.getElementById('statCards');
  container.innerHTML = cards
    .map(
      (c) => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="stat-card">
          <div class="stat-label">${c.label}</div>
          <div class="stat-value">${formatNumber(c.value)}</div>
        </div>
      </div>`
    )
    .join('');
}

function renderLowStock(items) {
  const container = document.getElementById('lowStockList');
  if (!items || !items.length) {
    container.innerHTML = '<p class="text-muted small mb-0">Nothing is below its minimum stock level.</p>';
    return;
  }
  container.innerHTML = `
    <table class="table table-sm mb-0">
      <thead><tr><th>Product</th><th>Current</th><th>Minimum</th></tr></thead>
      <tbody>
        ${items
          .map(
            (p) => `
          <tr>
            <td>${p.name}</td>
            <td class="text-danger fw-bold">${formatNumber(p.currentStock)}</td>
            <td>${formatNumber(p.minimumStock)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}

function renderRecentPayments(payments) {
  const container = document.getElementById('recentPaymentsList');
  if (!payments || !payments.length) {
    container.innerHTML = '<p class="text-muted small mb-0">No payments recorded yet.</p>';
    return;
  }
  container.innerHTML = `
    <table class="table table-sm mb-0">
      <thead><tr><th>Date</th><th>From/To</th><th>Amount</th></tr></thead>
      <tbody>
        ${payments
          .map(
            (p) => `
          <tr>
            <td>${new Date(p.date).toLocaleDateString()}</td>
            <td>${p.partyName}</td>
            <td class="${p.direction === 'in' ? 'text-success' : 'text-danger'} fw-bold">
              ${p.direction === 'in' ? '+' : '-'}${formatMoney(p.amount)}
            </td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}

function renderCustomersWithNoPayments(items) {
  const container = document.getElementById('noPaymentsList');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = '<p class="text-muted small mb-0">All customers have made payments within the last 30 days.</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Last Payment Date</th>
            <th>Days Without Payment</th>
            <th>Outstanding Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((c) => {
              const lastPaymentText = c.lastPaymentDate
                ? new Date(c.lastPaymentDate).toLocaleDateString()
                : '<span class="text-muted fst-italic">No payment history</span>';
              
              const daysText = c.daysSinceLastPayment !== null
                ? `${c.daysSinceLastPayment} days`
                : '<span class="text-muted">N/A</span>';
              
              const badge = c.daysSinceLastPayment !== null
                ? `<span class="badge bg-danger">Overdue (${c.daysSinceLastPayment}d)</span>`
                : `<span class="badge bg-warning text-dark">No Payment</span>`;

              return `
                <tr>
                  <td class="fw-medium">${c.name}</td>
                  <td>${lastPaymentText}</td>
                  <td>${daysText}</td>
                  <td class="fw-bold">${formatMoney(c.outstandingBalance)}</td>
                  <td>${badge}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(n || 0);
}

function formatMoney(n) {
  return '৳' + formatNumber(n);
}
