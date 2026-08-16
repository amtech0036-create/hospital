document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/challans.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Challans';

  const alertBox = document.getElementById('challanAlert');
  const successBox = document.getElementById('challanSuccess');
  const form = document.getElementById('challanForm');
  const lineItemsBody = document.getElementById('lineItemsBody');
  const modal = new bootstrap.Modal(document.getElementById('challanModal'));

  let customers = [];
  let products = [];
  let sales = [];
  let challans = [];
  let customerSearch;
  let saleSearch;
  let currentChallan = null;

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
  function toLocalDatetimeValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function customerName(id) {
    return customers.find((c) => c.id === id)?.name || id;
  }
  function getCustomer(id) {
    return customers.find((c) => c.id === id) || { name: customerName(id) };
  }
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  document.getElementById('challanDate').value = toLocalDatetimeValue();

  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
      if (btn.dataset.tab === 'listTab') loadChallans();
    });
  });

  function addLine() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="line-product-mount"></div></td>
      <td><input type="number" step="0.01" min="0.01" class="form-control form-control-sm line-qty" value="1" required /></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger line-remove">×</button></td>`;
    tr._productSelect = mountSearchSelect(tr.querySelector('.line-product-mount'), {
      items: products,
      placeholder: 'Search product...',
      size: 'sm',
      getLabel: (p) => p.name,
      getValue: (p) => p.id,
      getSubLabel: (p) => `${p.sku || p.id} · Stock: ${p.currentStock ?? 0}`
    });
    tr.querySelector('.line-remove').addEventListener('click', () => {
      if (lineItemsBody.children.length > 1) {
        tr._productSelect.destroy();
        tr.remove();
      }
    });
    lineItemsBody.appendChild(tr);
  }

  document.getElementById('addLineBtn').addEventListener('click', addLine);

  async function loadLookups() {
    const [custRes, prodRes, salesRes, company] = await Promise.all([
      apiRequest('/customers?status=Active'),
      apiRequest('/products?status=Active'),
      apiRequest('/sales?status=Completed'),
      getCompanySettings()
    ]);
    customers = custRes.data;
    products = prodRes.data;
    sales = salesRes.data;

    if (document.getElementById('senderPhone') && !document.getElementById('senderPhone').value) {
      document.getElementById('senderPhone').value = company?.companyPhone || '';
    }
    if (document.getElementById('senderAddress') && !document.getElementById('senderAddress').value) {
      document.getElementById('senderAddress').value = company?.companyAddress || '';
    }

    customerSearch?.destroy();
    customerSearch = mountSearchSelect(document.getElementById('customerSearchMount'), {
      items: customers,
      placeholder: 'Search customer...',
      required: true,
      getLabel: (c) => c.name,
      getValue: (c) => c.id,
      getSubLabel: (c) => [c.phone, c.email].filter(Boolean).join(' · '),
      onSelect: (c) => {
        if (c) {
          document.getElementById('receiverPhone').value = c.phone || '';
          document.getElementById('receiverAddress').value = c.address || '';
        }
      }
    });

    saleSearch?.destroy();
    saleSearch = mountSearchSelect(document.getElementById('saleSearchMount'), {
      items: sales,
      placeholder: 'Search invoice / sale (optional)...',
      getLabel: (s) => s.id,
      getValue: (s) => s.id,
      getSubLabel: (s) => `${customerName(s.customerId)} · ৳${Number(s.total).toLocaleString()}`,
      onSelect: (s) => {
        customerSearch.setValue(s.customerId);
        const cust = customers.find((c) => c.id === s.customerId);
        if (cust) {
          document.getElementById('receiverPhone').value = cust.phone || '';
          document.getElementById('receiverAddress').value = cust.address || '';
        }
      }
    });

    if (!lineItemsBody.children.length) addLine();
  }

  async function loadChallans() {
    const res = await apiRequest('/challans');
    challans = res.data;
    const body = document.getElementById('challanTableBody');
    if (!challans.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No challans yet.</td></tr>';
      return;
    }
    body.innerHTML = challans
      .map(
        (c) => `
      <tr>
        <td><code>${c.id}</code></td>
        <td>${new Date(c.challanDate).toLocaleString()}</td>
        <td>${customerName(c.customerId)}</td>
        <td>${c.saleId || '—'}</td>
        <td><span class="badge ${c.status === 'Dispatched' ? 'bg-success' : 'bg-secondary'}">${c.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary" data-print="${c.id}">Print</button>
          <button class="btn btn-sm btn-outline-primary" data-pdf="${c.id}">PDF</button>
          <button class="btn btn-sm btn-outline-primary" data-view="${c.id}">View</button>
          ${c.status === 'Dispatched' ? `<button class="btn btn-sm btn-outline-danger" data-cancel="${c.id}">Cancel</button>` : ''}
        </td>
      </tr>`
      )
      .join('');
    body.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => viewChallan(b.dataset.view)));
    body.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => quickPrint(b.dataset.print)));
    body.querySelectorAll('[data-pdf]').forEach((b) => b.addEventListener('click', () => quickPdf(b.dataset.pdf)));
    body.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => cancelChallan(b.dataset.cancel)));
  }

  async function fetchChallan(id) {
    const res = await apiRequest(`/challans/${id}`);
    return res.data;
  }

  async function quickPrint(id) {
    try {
      const challan = await fetchChallan(id);
      const company = await getCompanySettings();
      printChallan(challan, getCustomer(challan.customerId), company);
    } catch (err) {
      showError(err);
    }
  }

  async function quickPdf(id) {
    try {
      const challan = await fetchChallan(id);
      const company = await getCompanySettings();
      await downloadChallanPdf(challan, getCustomer(challan.customerId), company);
    } catch (err) {
      showError(err);
    }
  }

  async function viewChallan(id) {
    try {
      const c = await fetchChallan(id);
      currentChallan = c;
      const cust = getCustomer(c.customerId);
      const company = await getCompanySettings();
      const sPhone = c.senderPhone || company.companyPhone || '';
      const sAddr = c.senderAddress || company.companyAddress || '';
      const rPhone = c.receiverPhone || cust?.phone || '';
      const rAddr = c.receiverAddress || cust?.address || '';

      document.getElementById('challanModalTitle').textContent = `Challan ${c.id}`;
      document.getElementById('challanModalBody').innerHTML = `
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <div class="p-2 border rounded bg-light-subtle small">
              <strong class="text-primary d-block mb-1">Sender Details</strong>
              <div><strong>Name:</strong> ${escapeHtml(company.companyName || 'Inventory ERP')}</div>
              ${sPhone ? `<div><strong>Phone:</strong> ${escapeHtml(sPhone)}</div>` : ''}
              ${sAddr ? `<div><strong>Address:</strong> ${escapeHtml(sAddr)}</div>` : ''}
            </div>
          </div>
          <div class="col-md-6">
            <div class="p-2 border rounded bg-light-subtle small">
              <strong class="text-primary d-block mb-1">Receiver Details</strong>
              <div><strong>Deliver To:</strong> ${escapeHtml(cust?.name || customerName(c.customerId))}</div>
              ${rPhone ? `<div><strong>Phone:</strong> ${escapeHtml(rPhone)}</div>` : ''}
              ${rAddr ? `<div><strong>Address:</strong> ${escapeHtml(rAddr)}</div>` : ''}
            </div>
          </div>
        </div>
        <p class="mb-1"><strong>Date:</strong> ${new Date(c.challanDate).toLocaleString()}</p>
        <p class="mb-1"><strong>Sale:</strong> ${c.saleId || 'Standalone'}</p>
        <p class="mb-1"><strong>Status:</strong> ${c.status}</p>
        <p class="mb-1"><strong>Stock deducted:</strong> ${c.deductStock}</p>
        ${c.note ? `<p class="mb-1"><strong>Note:</strong> ${escapeHtml(c.note)}</p>` : ''}
        <table class="table table-sm mt-3"><thead><tr><th>Product</th><th>Qty</th></tr></thead>
        <tbody>${(c.items || []).map((i) => `<tr><td>${escapeHtml(i.productName)}</td><td>${i.quantity}</td></tr>`).join('')}</tbody></table>`;
      modal.show();
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('challanPrintBtn').addEventListener('click', async () => {
    if (!currentChallan) return;
    try {
      const company = await getCompanySettings();
      printChallan(currentChallan, getCustomer(currentChallan.customerId), company);
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('challanPdfBtn').addEventListener('click', async () => {
    if (!currentChallan) return;
    try {
      const company = await getCompanySettings();
      await downloadChallanPdf(currentChallan, getCustomer(currentChallan.customerId), company);
    } catch (err) {
      showError(err);
    }
  });

  async function cancelChallan(id) {
    if (!confirm('Cancel this challan? Stock will be restored if it was deducted.')) return;
    try {
      await apiRequest(`/challans/${id}/cancel`, { method: 'POST' });
      loadChallans();
    } catch (err) {
      showError(err);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');
    const customerId = customerSearch.getValue();
    if (!customerId) {
      showError(new Error('Select a customer.'));
      return;
    }
    const items = [];
    for (const tr of lineItemsBody.querySelectorAll('tr')) {
      const productId = tr._productSelect?.getValue();
      const quantity = parseFloat(tr.querySelector('.line-qty').value);
      if (productId) items.push({ productId, quantity });
    }
    const saleId = saleSearch.getValue();
    if (!saleId && !items.length) {
      showError(new Error('Add products or link to a sale.'));
      return;
    }
    const senderPhone = document.getElementById('senderPhone')?.value.trim() || '';
    const senderAddress = document.getElementById('senderAddress')?.value.trim() || '';
    const receiverPhone = document.getElementById('receiverPhone')?.value.trim() || '';
    const receiverAddress = document.getElementById('receiverAddress')?.value.trim() || '';

    const payload = {
      customerId,
      saleId: saleId || undefined,
      challanDate: document.getElementById('challanDate').value
        ? new Date(document.getElementById('challanDate').value).toISOString()
        : undefined,
      note: document.getElementById('note').value.trim(),
      senderPhone: senderPhone || undefined,
      senderAddress: senderAddress || undefined,
      receiverPhone: receiverPhone || undefined,
      receiverAddress: receiverAddress || undefined,
      items: items.length ? items : undefined
    };
    try {
      const res = await apiRequest('/challans', { method: 'POST', body: payload });
      showSuccess(`Challan created: ${res.data.id}`);
      form.reset();
      document.getElementById('challanDate').value = toLocalDatetimeValue();
      lineItemsBody.querySelectorAll('tr').forEach((tr) => tr._productSelect?.destroy());
      lineItemsBody.innerHTML = '';
      customerSearch.clear();
      saleSearch.clear();
      document.getElementById('receiverPhone').value = '';
      document.getElementById('receiverAddress').value = '';
      getCompanySettings().then((company) => {
        if (document.getElementById('senderPhone')) {
          document.getElementById('senderPhone').value = company?.companyPhone || '';
        }
        if (document.getElementById('senderAddress')) {
          document.getElementById('senderAddress').value = company?.companyAddress || '';
        }
      });
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
