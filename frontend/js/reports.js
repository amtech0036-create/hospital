document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/reports.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Reports';

  const alertBox = document.getElementById('reportAlert');
  let salesChart = null;
  let topProductsChart = null;
  let currencySymbol = '৳';

  function showError(err) {
    alertBox.textContent = err.message || 'Failed to load report.';
    alertBox.classList.remove('d-none');
  }

  function formatMoney(n) {
    return currencySymbol + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function currentMonthRange() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return {
      from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
      to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    };
  }

  function setDefaultDates() {
    const { from, to } = currentMonthRange();
    document.getElementById('reportDateFrom').value = from;
    document.getElementById('reportDateTo').value = to;
  }

  function renderStatCards(report) {
    const cards = [
      { label: 'Total Sales', value: formatMoney(report.sales.total), sub: `${report.sales.count} invoice${report.sales.count === 1 ? '' : 's'}` },
      { label: 'Total Purchases', value: formatMoney(report.purchases.total), sub: `${report.purchases.count} purchase${report.purchases.count === 1 ? '' : 's'}` },
      { label: 'Gross Profit', value: formatMoney(report.grossProfit), sub: 'Sales margin' },
      { label: 'Total Expenses', value: formatMoney(report.expenses.total), sub: `${report.expenses.count} expense${report.expenses.count === 1 ? '' : 's'}` },
      { label: 'Payroll Paid', value: formatMoney(report.payroll.total), sub: `${report.payroll.count} payment${report.payroll.count === 1 ? '' : 's'}` },
      { label: 'Net Profit', value: formatMoney(report.netProfit), sub: 'Gross − expenses − payroll' },
      { label: 'Payments Received', value: formatMoney(report.payments.received), sub: 'From customers' },
      { label: 'Payments Paid', value: formatMoney(report.payments.paid), sub: 'To suppliers' },
      { label: 'Customer Due', value: formatMoney(report.snapshots.customerDue), sub: 'Current balance' },
      { label: 'Supplier Due', value: formatMoney(report.snapshots.supplierDue), sub: 'Current balance' },
      { label: 'Stock Value', value: formatMoney(report.snapshots.stockValue), sub: 'At cost price' }
    ];

    document.getElementById('reportStatCards').innerHTML = cards
      .map(
        (c) => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="stat-card">
          <div class="stat-label">${c.label}</div>
          <div class="stat-value">${c.value}</div>
          <div class="text-muted small">${c.sub}</div>
        </div>
      </div>`
      )
      .join('');
  }

  function renderExpensesTable(categories) {
    const container = document.getElementById('expensesByCategoryBody');
    if (!categories.length) {
      container.innerHTML = '<p class="text-muted small mb-0">No expenses in this period.</p>';
      return;
    }
    container.innerHTML = `
      <table class="table table-sm mb-0">
        <thead><tr><th>Category</th><th>Count</th><th class="text-end">Amount</th></tr></thead>
        <tbody>
          ${categories
            .map(
              (c) => `
            <tr>
              <td>${c.category}</td>
              <td>${c.count}</td>
              <td class="text-end fw-bold">${formatMoney(c.total)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  }

  function renderSalesByDayTable(days) {
    const container = document.getElementById('salesByDayBody');
    if (!days.length) {
      container.innerHTML = '<p class="text-muted small mb-0">No sales in this period.</p>';
      return;
    }
    container.innerHTML = `
      <div class="table-responsive" style="max-height:320px;overflow-y:auto">
        <table class="table table-sm mb-0">
          <thead><tr><th>Date</th><th>Sales</th><th class="text-end">Amount</th></tr></thead>
          <tbody>
            ${days
              .map(
                (d) => `
              <tr>
                <td>${new Date(d.date + 'T00:00:00').toLocaleDateString()}</td>
                <td>${d.count}</td>
                <td class="text-end fw-bold">${formatMoney(d.total)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderCharts(report) {
    const salesCtx = document.getElementById('salesByDayChart');
    const topCtx = document.getElementById('topProductsChart');

    if (salesChart) salesChart.destroy();
    if (topProductsChart) topProductsChart.destroy();

    const salesDays = report.salesByDay.length ? report.salesByDay : [{ date: report.range.to, count: 0, total: 0 }];
    const topProducts = report.topProducts.length
      ? report.topProducts
      : [{ productName: 'No sales', revenue: 0 }];

    salesChart = new Chart(salesCtx, {
      type: 'bar',
      data: {
        labels: salesDays.map((d) => new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
        datasets: [
          {
            label: 'Sales',
            data: salesDays.map((d) => d.total),
            backgroundColor: 'rgba(47, 111, 237, 0.7)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    topProductsChart = new Chart(topCtx, {
      type: 'doughnut',
      data: {
        labels: topProducts.map((p) => p.productName),
        datasets: [
          {
            data: topProducts.map((p) => p.revenue),
            backgroundColor: ['#2f6fed', '#12b76a', '#f79009', '#f04438', '#6941c6', '#06aed4', '#84cc16', '#ec4899', '#64748b', '#0ea5e9']
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });
  }

  async function loadReport() {
    alertBox.classList.add('d-none');
    const from = document.getElementById('reportDateFrom').value;
    const to = document.getElementById('reportDateTo').value;
    if (!from || !to) {
      showError(new Error('Please select both From and To dates.'));
      return;
    }

    try {
      const [reportRes, settings] = await Promise.all([
        apiRequest(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        getCompanySettings()
      ]);
      currencySymbol = settings.currencySymbol || '৳';
      const report = reportRes.data;

      document.getElementById('reportRangeLabel').textContent = `${from} to ${to}`;
      renderStatCards(report);
      renderExpensesTable(report.expenses.byCategory);
      renderSalesByDayTable(report.salesByDay);
      renderCharts(report);
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('reportRunBtn').addEventListener('click', loadReport);
  document.getElementById('reportDateClear').addEventListener('click', () => {
    setDefaultDates();
    loadReport();
  });

  setDefaultDates();
  await loadReport();
});
