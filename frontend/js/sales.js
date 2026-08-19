document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/sales.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'New Sale';

  const alertBox = document.getElementById('saleAlert');
  const successBox = document.getElementById('saleSuccess');
  const form = document.getElementById('saleForm');
  const lineItemsBody = document.getElementById('lineItemsBody');

  let customers = [];
  let products = [];
  let customerSearch;

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

  document.getElementById('saleDate').value = toLocalDatetimeValue();

  async function loadLookups() {
    const [custRes, prodRes] = await Promise.all([
      apiRequest('/customers?status=Active'),
      apiRequest('/products?status=Active')
    ]);
    customers = custRes.data;
    products = prodRes.data;

    if (customerSearch) customerSearch.destroy();
    customerSearch = mountSearchSelect(document.getElementById('customerSearchMount'), {
      items: customers,
      placeholder: 'Search customer by name, phone, email...',
      required: true,
      getLabel: (c) => c.name,
      getValue: (c) => c.id,
      getSubLabel: (c) => [c.phone, c.email].filter(Boolean).join(' · ')
    });

    if (!lineItemsBody.children.length) addLine();
  }

  function addLine() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="line-product-mount"></div></td>
      <td class="line-stock text-muted">—</td>
      <td><input type="number" step="0.01" min="0.01" class="form-control form-control-sm line-qty" value="1" required /></td>
      <td><input type="number" step="0.01" min="0" class="form-control form-control-sm line-price" required /></td>
      <td class="line-total fw-bold">৳0.00</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger line-remove">×</button></td>`;

    const productSelect = mountSearchSelect(tr.querySelector('.line-product-mount'), {
      items: products,
      placeholder: 'Search product name or SKU...',
      size: 'sm',
      required: true,
      getLabel: (p) => p.name,
      getValue: (p) => p.id,
      getSubLabel: (p) => `${p.sku || p.id} · Stock: ${p.currentStock ?? 0} · ৳${Number(p.sellingPrice || 0).toLocaleString()}`,
      onSelect: (p) => onProductSelected(tr, p)
    });
    tr._productSelect = productSelect;

    bindLineEvents(tr);
    lineItemsBody.appendChild(tr);
    recalcTotals();
  }

  function onProductSelected(tr, product) {
    tr.querySelector('.line-stock').textContent = product.currentStock ?? '0';
    tr.querySelector('.line-price').value = product.sellingPrice || '0';
    recalcLine(tr);
  }

  function bindLineEvents(tr) {
    const qtyInput = tr.querySelector('.line-qty');
    const priceInput = tr.querySelector('.line-price');
    const removeBtn = tr.querySelector('.line-remove');

    qtyInput.addEventListener('input', () => recalcLine(tr));
    priceInput.addEventListener('input', () => recalcLine(tr));
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
    const price = parseFloat(tr.querySelector('.line-price').value) || 0;
    tr.querySelector('.line-total').textContent = formatMoney(qty * price);
    recalcTotals();
  }

  function recalcTotals() {
    let subtotal = 0;
    lineItemsBody.querySelectorAll('tr').forEach((tr) => {
      const qty = parseFloat(tr.querySelector('.line-qty').value) || 0;
      const price = parseFloat(tr.querySelector('.line-price').value) || 0;
      subtotal += qty * price;
    });
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
    const baseAmount = Math.max(0, subtotal - discount);
    const total = baseAmount * (1 + vatRate / 100);

    document.getElementById('subtotalLabel').textContent = formatMoney(subtotal);
    document.getElementById('totalLabel').textContent = formatMoney(total);
  }

  document.getElementById('addLineBtn').addEventListener('click', addLine);
  document.getElementById('discount').addEventListener('input', recalcTotals);
  document.getElementById('vatRate').addEventListener('input', recalcTotals);

  document.getElementById('paymentMethod').addEventListener('change', (e) => {
    const total = parseFloat(document.getElementById('totalLabel').textContent.replace(/[^\d.]/g, '')) || 0;
    if (e.target.value === 'Credit') {
      document.getElementById('amountPaid').value = '0';
    } else {
      document.getElementById('amountPaid').value = total.toFixed(2);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');

    const customerId = customerSearch.getValue();
    if (!customerId) {
      showError(new Error('Please select a customer from the search list.'));
      return;
    }

    const items = [];
    for (const tr of lineItemsBody.querySelectorAll('tr')) {
      const productId = tr._productSelect?.getValue();
      const quantity = parseFloat(tr.querySelector('.line-qty').value);
      const unitPrice = parseFloat(tr.querySelector('.line-price').value);
      if (!productId) continue;
      items.push({ productId, quantity, unitPrice });
    }

    if (!items.length) {
      showError(new Error('Add at least one product line.'));
      return;
    }

    const saleDateRaw = document.getElementById('saleDate').value;
    const payload = {
      customerId,
      saleDate: saleDateRaw ? new Date(saleDateRaw).toISOString() : undefined,
      discount: parseFloat(document.getElementById('discount').value) || 0,
      vatRate: parseFloat(document.getElementById('vatRate').value) || 0,
      amountPaid: parseFloat(document.getElementById('amountPaid').value) || 0,
      paymentMethod: document.getElementById('paymentMethod').value,
      note: document.getElementById('note').value.trim(),
      items
    };

    try {
      const res = await apiRequest('/sales', { method: 'POST', body: payload });
      showSuccess(`Sale recorded: ${res.data.id} — Total ${formatMoney(res.data.total)}`);
      form.reset();
      document.getElementById('saleDate').value = toLocalDatetimeValue();
      lineItemsBody.querySelectorAll('tr').forEach((tr) => tr._productSelect?.destroy());
      lineItemsBody.innerHTML = '';
      customerSearch.clear();
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
