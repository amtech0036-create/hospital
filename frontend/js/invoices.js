document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/invoices.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Invoices';

  const alertBox = document.getElementById('invoiceAlert');
  const modalEl = document.getElementById('invoiceModal');
  const modal = new bootstrap.Modal(modalEl);
  const returnModal = new bootstrap.Modal(document.getElementById('returnModal'));
  const returnForm = document.getElementById('returnForm');

  let customers = [];
  let sales = [];
  let currentSale = null;
  let returnQtyMap = {};
  let dateFrom = '';
  let dateTo = '';

  function showError(err) {
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }
  function formatMoney(n) {
    return '৳' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function customerName(id) {
    const c = customers.find((x) => x.id === id);
    return c ? c.name : id;
  }
  function getCustomer(id) {
    return customers.find((x) => x.id === id) || { name: customerName(id) };
  }
  function statusBadge(status) {
    return status === 'Completed'
      ? '<span class="badge bg-success">Completed</span>'
      : '<span class="badge bg-secondary">Cancelled</span>';
  }

  async function loadData() {
    const [custRes, salesRes] = await Promise.all([apiRequest('/customers'), apiRequest('/sales')]);
    customers = custRes.data;
    sales = salesRes.data;
    renderTable();
  }

  function getFilteredSales() {
    return sales.filter((s) => {
      if (s.status !== 'Completed') return false;
      return isDateInRange(s.saleDate, dateFrom, dateTo);
    });
  }

  function updateSummary() {
    const summaryEl = document.getElementById('invoiceDateSummary');
    if (!dateFrom && !dateTo) {
      summaryEl.classList.add('d-none');
      return;
    }
    const filtered = getFilteredSales();
    const totalAmount = filtered.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const range = formatRangeLabel(dateFrom, dateTo);
    summaryEl.innerHTML = `<strong>${filtered.length}</strong> sale${filtered.length === 1 ? '' : 's'} (${range}) &mdash; Total: <strong>${formatMoney(totalAmount)}</strong>`;
    summaryEl.classList.remove('d-none');
  }

  function renderTable() {
    const body = document.getElementById('invoiceTableBody');
    const displaySales = sales.filter((s) => isDateInRange(s.saleDate, dateFrom, dateTo));
    updateSummary();

    if (!displaySales.length) {
      const msg = sales.length
        ? 'No sales in this date range.'
        : 'No sales recorded yet.';
      body.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">${msg}</td></tr>`;
      return;
    }
    body.innerHTML = displaySales
      .map(
        (s) => `
      <tr>
        <td><code>${s.id}</code></td>
        <td>${new Date(s.saleDate).toLocaleString()}</td>
        <td>${customerName(s.customerId)}</td>
        <td>${formatMoney(s.total)}</td>
        <td>${formatMoney(s.amountPaid)}</td>
        <td>${statusBadge(s.status)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-dark" data-pos="${s.id}">POS</button>
          <button class="btn btn-sm btn-outline-secondary" data-print="${s.id}">Print</button>
          <button class="btn btn-sm btn-outline-primary" data-pdf="${s.id}">PDF</button>
          <button class="btn btn-sm btn-outline-primary" data-view="${s.id}">View</button>
        </td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => viewInvoice(btn.dataset.view)));
    body.querySelectorAll('[data-pos]').forEach((btn) => btn.addEventListener('click', () => quickPosPrint(btn.dataset.pos)));
    body.querySelectorAll('[data-print]').forEach((btn) => btn.addEventListener('click', () => quickPrint(btn.dataset.print)));
    body.querySelectorAll('[data-pdf]').forEach((btn) => btn.addEventListener('click', () => quickPdf(btn.dataset.pdf)));
  }

  function renderInvoiceBody(sale, returns = []) {
    const cust = getCustomer(sale.customerId);
    const returnsHtml = returns.length
      ? `<h6 class="mt-3">Returns</h6><ul class="small">${returns
          .map((r) => `<li>${r.id} — ${formatMoney(r.total)} on ${new Date(r.returnDate).toLocaleDateString()}</li>`)
          .join('')}</ul>`
      : '';

    return `
      <div id="invoicePrintArea">
        <p class="mb-1"><strong>Status:</strong> ${sale.status}</p>
        <p class="mb-1"><strong>Customer (Bill To):</strong> ${escapeHtml(cust?.name || customerName(sale.customerId))}</p>
        ${cust?.address ? `<p class="mb-1"><strong>Address:</strong> ${escapeHtml(cust.address)}</p>` : ''}
        ${cust?.phone ? `<p class="mb-1"><strong>Phone:</strong> ${escapeHtml(cust.phone)}</p>` : ''}
        <p class="mb-1"><strong>Paid:</strong> ${formatMoney(sale.amountPaid)} of ${formatMoney(sale.total)}</p>
        <p class="mb-1"><strong>Date:</strong> ${new Date(sale.saleDate).toLocaleString()}</p>
        <p class="mb-1"><strong>Payment:</strong> ${escapeHtml(sale.paymentMethod)}</p>
        ${sale.note ? `<p class="mb-1"><strong>Note:</strong> ${escapeHtml(sale.note)}</p>` : ''}
        <table class="table table-sm mt-3">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            ${(sale.items || [])
              .map(
                (i) => `
              <tr>
                <td>${escapeHtml(i.productName)}</td>
                <td>${i.quantity}</td>
                <td>${formatMoney(i.unitPrice)}</td>
                <td>${formatMoney(i.lineTotal)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3" class="text-end">Subtotal</td><td>${formatMoney(sale.subtotal)}</td></tr>
            <tr><td colspan="3" class="text-end">Discount</td><td>${formatMoney(sale.discount)}</td></tr>
            ${sale.vatRate ? `<tr><td colspan="3" class="text-end">VAT (${sale.vatRate}%)</td><td>${formatMoney(sale.vatAmount || (sale.subtotal - sale.discount) * (sale.vatRate / 100))}</td></tr>` : ''}
            <tr><td colspan="3" class="text-end fw-bold">Total</td><td class="fw-bold">${formatMoney(sale.total)}</td></tr>
          </tfoot>
        </table>
        ${returnsHtml}
      </div>`;
  }

  async function fetchSale(id) {
    const res = await apiRequest(`/sales/${id}`);
    return res.data;
  }

  function updateActionButtons(sale) {
    const isCompleted = sale.status === 'Completed';
    document.getElementById('invoiceReturnBtn').classList.toggle('d-none', !isCompleted);
    document.getElementById('invoiceCancelBtn').classList.toggle('d-none', !isCompleted);
  }

  async function viewInvoice(id) {
    try {
      currentSale = await fetchSale(id);
      const returnsRes = await apiRequest(`/sales/${id}/returns`);
      document.getElementById('invoiceModalTitle').textContent = `Invoice ${currentSale.id}`;
      document.getElementById('invoiceModalBody').innerHTML = renderInvoiceBody(currentSale, returnsRes.data);
      updateActionButtons(currentSale);
      modal.show();
    } catch (err) {
      showError(err);
    }
  }

  async function openReturnForm() {
    if (!currentSale) return;
    const returnsRes = await apiRequest(`/sales/${currentSale.id}/returns`);
    returnQtyMap = {};
    for (const ret of returnsRes.data) {
      for (const item of ret.items || []) {
        returnQtyMap[item.productId] = (returnQtyMap[item.productId] || 0) + parseFloat(item.quantity);
      }
    }

    document.getElementById('returnFormBody').innerHTML = (currentSale.items || [])
      .map((i) => {
        const returned = returnQtyMap[i.productId] || 0;
        const remaining = parseFloat(i.quantity) - returned;
        return `
        <div class="mb-3 border-bottom pb-2">
          <label class="form-label">${i.productName} <span class="text-muted small">(sold: ${i.quantity}, returned: ${returned}, max: ${remaining})</span></label>
          <input type="number" step="0.01" min="0" max="${remaining}" class="form-control return-qty" data-product="${i.productId}" value="0" ${remaining <= 0 ? 'disabled' : ''} />
        </div>`;
      })
      .join('');

    returnModal.show();
  }

  returnForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentSale) return;
    const items = [];
    document.querySelectorAll('.return-qty').forEach((input) => {
      const qty = parseFloat(input.value);
      if (qty > 0) items.push({ productId: input.dataset.product, quantity: qty });
    });
    if (!items.length) {
      showError(new Error('Enter a return quantity for at least one item.'));
      return;
    }
    try {
      await apiRequest(`/sales/${currentSale.id}/return`, { method: 'POST', body: { items } });
      returnModal.hide();
      modal.hide();
      await loadData();
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('invoiceReturnBtn').addEventListener('click', openReturnForm);

  document.getElementById('invoiceCancelBtn').addEventListener('click', async () => {
    if (!currentSale) return;
    if (!confirm(`Cancel sale ${currentSale.id}? This reverses stock and ledger entries.`)) return;
    try {
      await apiRequest(`/sales/${currentSale.id}/cancel`, { method: 'POST' });
      modal.hide();
      await loadData();
    } catch (err) {
      showError(err);
    }
  });

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function quickPosPrint(id) {
    try {
      const sale = await fetchSale(id);
      const company = await getCompanySettings();
      printPosReceipt(sale, getCustomer(sale.customerId), company);
    } catch (err) {
      showError(err);
    }
  }

  async function quickPrint(id) {
    try {
      const sale = await fetchSale(id);
      const company = await getCompanySettings();
      printInvoice(sale, getCustomer(sale.customerId), company);
    } catch (err) {
      showError(err);
    }
  }

  async function quickPdf(id) {
    try {
      const sale = await fetchSale(id);
      const company = await getCompanySettings();
      await downloadInvoicePdf(sale, getCustomer(sale.customerId), company);
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('invoicePosPrintBtn')?.addEventListener('click', async () => {
    if (!currentSale) return;
    try {
      const company = await getCompanySettings();
      printPosReceipt(currentSale, getCustomer(currentSale.customerId), company);
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('invoicePrintBtn').addEventListener('click', async () => {
    if (!currentSale) return;
    try {
      const company = await getCompanySettings();
      printInvoice(currentSale, getCustomer(currentSale.customerId), company);
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('invoicePdfBtn').addEventListener('click', async () => {
    if (!currentSale) return;
    try {
      const company = await getCompanySettings();
      await downloadInvoicePdf(currentSale, getCustomer(currentSale.customerId), company);
    } catch (err) {
      showError(err);
    }
  });

  try {
    bindDateRangeFilter('invoiceDateFrom', 'invoiceDateTo', 'invoiceDateClear', (from, to) => {
      dateFrom = from;
      dateTo = to;
      renderTable();
    });
    await loadData();
  } catch (err) {
    showError(err);
  }
});
