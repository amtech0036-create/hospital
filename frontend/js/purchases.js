document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/purchases.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Purchases';

  const alertBox = document.getElementById('purchaseAlert');
  const successBox = document.getElementById('purchaseSuccess');
  const form = document.getElementById('purchaseForm');
  const lineItemsBody = document.getElementById('lineItemsBody');
  const modalEl = document.getElementById('purchaseModal');
  const modal = new bootstrap.Modal(modalEl);
  const returnModal = new bootstrap.Modal(document.getElementById('returnModal'));
  const returnForm = document.getElementById('returnForm');

  let suppliers = [];
  let products = [];
  let purchases = [];
  let supplierSearch;
  let currentPurchase = null;

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
  function supplierName(id) {
    const s = suppliers.find((x) => x.id === id);
    return s ? s.name : id;
  }
  function statusBadge(status) {
    return status === 'Completed'
      ? '<span class="badge bg-success">Completed</span>'
      : '<span class="badge bg-secondary">Cancelled</span>';
  }

  function toLocalDatetimeValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  document.getElementById('purchaseDate').value = toLocalDatetimeValue();

  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
      if (btn.dataset.tab === 'listTab') loadPurchaseList();
    });
  });

  function addLine() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="line-product-mount"></div></td>
      <td><input type="number" step="0.01" min="0.01" class="form-control form-control-sm line-qty" value="1" required /></td>
      <td><input type="number" step="0.01" min="0" class="form-control form-control-sm line-cost" required /></td>
      <td class="line-total fw-bold">৳0.00</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger line-remove">×</button></td>`;

    const productSelect = mountSearchSelect(tr.querySelector('.line-product-mount'), {
      items: products,
      placeholder: 'Search product name or SKU...',
      size: 'sm',
      required: true,
      getLabel: (p) => p.name,
      getValue: (p) => p.id,
      getSubLabel: (p) => `${p.sku || p.id} · Cost: ৳${Number(p.purchasePrice || 0).toLocaleString()}`,
      onSelect: (p) => onProductSelected(tr, p)
    });
    tr._productSelect = productSelect;

    bindLineEvents(tr);
    lineItemsBody.appendChild(tr);
    recalcTotals();
  }

  function onProductSelected(tr, product) {
    tr.querySelector('.line-cost').value = product.purchasePrice || '0';
    recalcLine(tr);
  }

  function bindLineEvents(tr) {
    const qtyInput = tr.querySelector('.line-qty');
    const costInput = tr.querySelector('.line-cost');
    const removeBtn = tr.querySelector('.line-remove');

    qtyInput.addEventListener('input', () => recalcLine(tr));
    costInput.addEventListener('input', () => recalcLine(tr));
    removeBtn.addEventListener('click', () => {
      if (lineItemsBody.children.length > 1) {
        tr._productSelect?.destroy();
        tr.remove();
        recalcTotals();
      }
    });
  }

  function recalcLine(tr) {
    const qty = parseFloat(tr.querySelector('.line-qty').value) || 0;
    const cost = parseFloat(tr.querySelector('.line-cost').value) || 0;
    tr.querySelector('.line-total').textContent = formatMoney(qty * cost);
    recalcTotals();
  }

  function recalcTotals() {
    let subtotal = 0;
    lineItemsBody.querySelectorAll('tr').forEach((tr) => {
      const qty = parseFloat(tr.querySelector('.line-qty').value) || 0;
      const cost = parseFloat(tr.querySelector('.line-cost').value) || 0;
      subtotal += qty * cost;
    });
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const total = Math.max(0, subtotal - discount);
    document.getElementById('subtotalLabel').textContent = formatMoney(subtotal);
    document.getElementById('totalLabel').textContent = formatMoney(total);
  }

  document.getElementById('addLineBtn').addEventListener('click', addLine);
  document.getElementById('discount').addEventListener('input', recalcTotals);

  document.getElementById('paymentMethod').addEventListener('change', (e) => {
    const total = parseFloat(document.getElementById('totalLabel').textContent.replace(/[^\d.]/g, '')) || 0;
    document.getElementById('amountPaid').value = e.target.value === 'Credit' ? '0' : total.toFixed(2);
  });

  async function loadLookups() {
    const [supRes, prodRes] = await Promise.all([
      apiRequest('/suppliers?status=Active'),
      apiRequest('/products?status=Active')
    ]);
    suppliers = supRes.data;
    products = prodRes.data;

    if (supplierSearch) supplierSearch.destroy();
    supplierSearch = mountSearchSelect(document.getElementById('supplierSearchMount'), {
      items: suppliers,
      placeholder: 'Search supplier by name, phone, email...',
      required: true,
      getLabel: (s) => s.name,
      getValue: (s) => s.id,
      getSubLabel: (s) => [s.phone, s.email].filter(Boolean).join(' · ')
    });

    if (!lineItemsBody.children.length) addLine();
  }

  async function loadPurchaseList() {
    try {
      const res = await apiRequest('/purchases');
      purchases = res.data;
      renderPurchaseTable();
    } catch (err) {
      showError(err);
    }
  }

  function renderPurchaseTable() {
    const body = document.getElementById('purchaseTableBody');
    if (!purchases.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No purchases recorded yet.</td></tr>';
      return;
    }
    body.innerHTML = purchases
      .map(
        (p) => `
      <tr>
        <td><code>${p.id}</code></td>
        <td>${new Date(p.purchaseDate).toLocaleString()}</td>
        <td>${supplierName(p.supplierId)}</td>
        <td>${formatMoney(p.total)}</td>
        <td>${formatMoney(p.amountPaid)}</td>
        <td>${statusBadge(p.status)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary" data-print="${p.id}">Print</button>
          <button class="btn btn-sm btn-outline-primary" data-pdf="${p.id}">PDF</button>
          <button class="btn btn-sm btn-outline-primary" data-view="${p.id}">View</button>
        </td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('[data-view]').forEach((btn) =>
      btn.addEventListener('click', () => viewPurchase(btn.dataset.view))
    );
    body.querySelectorAll('[data-print]').forEach((btn) =>
      btn.addEventListener('click', () => quickPrint(btn.dataset.print))
    );
    body.querySelectorAll('[data-pdf]').forEach((btn) =>
      btn.addEventListener('click', () => quickPdf(btn.dataset.pdf))
    );
  }

  async function fetchPurchase(id) {
    const res = await apiRequest(`/purchases/${id}`);
    return res.data;
  }

  async function quickPrint(id) {
    try {
      const purchase = await fetchPurchase(id);
      const company = await getCompanySettings();
      printPurchase(purchase, supplierName(purchase.supplierId), company);
    } catch (err) {
      showError(err);
    }
  }

  async function quickPdf(id) {
    try {
      const purchase = await fetchPurchase(id);
      const company = await getCompanySettings();
      await downloadPurchasePdf(purchase, supplierName(purchase.supplierId), company);
    } catch (err) {
      showError(err);
    }
  }

  async function viewPurchase(id) {
    try {
      const res = await apiRequest(`/purchases/${id}`);
      currentPurchase = res.data;
      const returnsRes = await apiRequest(`/purchases/${id}/returns`);
      document.getElementById('purchaseModalTitle').textContent = `Purchase ${currentPurchase.id}`;
      document.getElementById('purchaseModalBody').innerHTML = `
        <p><strong>Status:</strong> ${currentPurchase.status}</p>
        <p><strong>Supplier:</strong> ${supplierName(currentPurchase.supplierId)}</p>
        <p><strong>Date:</strong> ${new Date(currentPurchase.purchaseDate).toLocaleString()}</p>
        <p><strong>Payment:</strong> ${currentPurchase.paymentMethod} — Paid ${formatMoney(currentPurchase.amountPaid)} of ${formatMoney(currentPurchase.total)}</p>
        ${currentPurchase.note ? `<p><strong>Note:</strong> ${currentPurchase.note}</p>` : ''}
        <table class="table table-sm mt-3">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
          <tbody>
            ${(currentPurchase.items || [])
              .map(
                (i) => `
              <tr>
                <td>${i.productName}</td>
                <td>${i.quantity}</td>
                <td>${formatMoney(i.unitCost)}</td>
                <td>${formatMoney(i.lineTotal)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3" class="text-end">Subtotal</td><td>${formatMoney(currentPurchase.subtotal)}</td></tr>
            <tr><td colspan="3" class="text-end">Discount</td><td>${formatMoney(currentPurchase.discount)}</td></tr>
            <tr><td colspan="3" class="text-end fw-bold">Total</td><td class="fw-bold">${formatMoney(currentPurchase.total)}</td></tr>
          </tfoot>
        </table>
        ${
          returnsRes.data.length
            ? `<h6 class="mt-3">Returns</h6><ul class="small">${returnsRes.data
                .map((r) => `<li>${r.id} — ${formatMoney(r.total)}</li>`)
                .join('')}</ul>`
            : ''
        }`;
      const isCompleted = currentPurchase.status === 'Completed';
      document.getElementById('purchaseReturnBtn').classList.toggle('d-none', !isCompleted);
      document.getElementById('purchaseCancelBtn').classList.toggle('d-none', !isCompleted);
      modal.show();
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('purchaseReturnBtn').addEventListener('click', async () => {
    if (!currentPurchase) return;
    const returnsRes = await apiRequest(`/purchases/${currentPurchase.id}/returns`);
    const returnQtyMap = {};
    for (const ret of returnsRes.data) {
      for (const item of ret.items || []) {
        returnQtyMap[item.productId] = (returnQtyMap[item.productId] || 0) + parseFloat(item.quantity);
      }
    }
    document.getElementById('returnFormBody').innerHTML = (currentPurchase.items || [])
      .map((i) => {
        const returned = returnQtyMap[i.productId] || 0;
        const remaining = parseFloat(i.quantity) - returned;
        return `
        <div class="mb-3 border-bottom pb-2">
          <label class="form-label">${i.productName} <span class="text-muted small">(max: ${remaining})</span></label>
          <input type="number" step="0.01" min="0" max="${remaining}" class="form-control return-qty" data-product="${i.productId}" value="0" ${remaining <= 0 ? 'disabled' : ''} />
        </div>`;
      })
      .join('');
    returnModal.show();
  });

  returnForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentPurchase) return;
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
      await apiRequest(`/purchases/${currentPurchase.id}/return`, { method: 'POST', body: { items } });
      returnModal.hide();
      modal.hide();
      loadPurchaseList();
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('purchasePrintBtn').addEventListener('click', async () => {
    if (!currentPurchase) return;
    try {
      const company = await getCompanySettings();
      printPurchase(currentPurchase, supplierName(currentPurchase.supplierId), company);
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('purchasePdfBtn').addEventListener('click', async () => {
    if (!currentPurchase) return;
    try {
      const company = await getCompanySettings();
      await downloadPurchasePdf(currentPurchase, supplierName(currentPurchase.supplierId), company);
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('purchaseCancelBtn').addEventListener('click', async () => {
    if (!currentPurchase) return;
    if (!confirm(`Cancel purchase ${currentPurchase.id}?`)) return;
    try {
      await apiRequest(`/purchases/${currentPurchase.id}/cancel`, { method: 'POST' });
      modal.hide();
      loadPurchaseList();
    } catch (err) {
      showError(err);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');

    const supplierId = supplierSearch.getValue();
    if (!supplierId) {
      showError(new Error('Please select a supplier from the search list.'));
      return;
    }

    const items = [];
    for (const tr of lineItemsBody.querySelectorAll('tr')) {
      const productId = tr._productSelect?.getValue();
      const quantity = parseFloat(tr.querySelector('.line-qty').value);
      const unitCost = parseFloat(tr.querySelector('.line-cost').value);
      if (!productId) continue;
      items.push({ productId, quantity, unitCost });
    }

    if (!items.length) {
      showError(new Error('Add at least one product line.'));
      return;
    }

    const purchaseDateRaw = document.getElementById('purchaseDate').value;
    const payload = {
      supplierId,
      purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw).toISOString() : undefined,
      discount: parseFloat(document.getElementById('discount').value) || 0,
      amountPaid: parseFloat(document.getElementById('amountPaid').value) || 0,
      paymentMethod: document.getElementById('paymentMethod').value,
      note: document.getElementById('note').value.trim(),
      items
    };

    try {
      const res = await apiRequest('/purchases', { method: 'POST', body: payload });
      showSuccess(`Purchase recorded: ${res.data.id} — Total ${formatMoney(res.data.total)}`);
      form.reset();
      document.getElementById('purchaseDate').value = toLocalDatetimeValue();
      lineItemsBody.querySelectorAll('tr').forEach((tr) => tr._productSelect?.destroy());
      lineItemsBody.innerHTML = '';
      supplierSearch.clear();
      addLine();
    } catch (err) {
      showError(err);
    }
  });

  try {
    await loadLookups();
  } catch (err) {
    showError(err);
  }
});
