document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/products.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Products';

  const alertBox = document.getElementById('productAlert');
  const modalEl = document.getElementById('productModal');
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('productForm');

  let editingId = null;
  let categories = [];
  let brands = [];
  let units = [];

  function showError(err) {
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }
  function clearError() {
    alertBox.classList.add('d-none');
  }

  // ---- Load lookups for the dropdowns ----
  async function loadLookups() {
    const [catRes, brandRes, unitRes] = await Promise.all([
      apiRequest('/categories?status=Active'),
      apiRequest('/brands?status=Active'),
      apiRequest('/units?status=Active')
    ]);
    categories = catRes.data;
    brands = brandRes.data;
    units = unitRes.data;

    fillSelect('p_categoryId', categories);
    fillSelect('p_brandId', brands);
    fillSelect('p_unitId', units);
  }

  function fillSelect(id, items) {
    const select = document.getElementById(id);
    select.innerHTML =
      '<option value="">—</option>' + items.map((i) => `<option value="${i.id}">${i.name}</option>`).join('');
  }

  function lookupName(list, id) {
    const found = list.find((i) => i.id === id);
    return found ? found.name : '';
  }

  // ---- Load + render product table ----
  async function loadProducts(search = '') {
    try {
      const res = await apiRequest(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      renderTable(res.data);
    } catch (err) {
      showError(err);
    }
  }

  function renderTable(products) {
    const body = document.getElementById('productTableBody');
    if (!products.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No products yet.</td></tr>';
      return;
    }
    body.innerHTML = products
      .map(
        (p) => `
      <tr>
        <td>${p.sku || ''}</td>
        <td>${p.name}</td>
        <td>৳${Number(p.purchasePrice || 0).toLocaleString()}</td>
        <td>৳${Number(p.sellingPrice || 0).toLocaleString()}</td>
        <td class="${p.lowStock ? 'text-danger fw-bold' : ''}">${p.currentStock}</td>
        <td><span class="badge ${p.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${p.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-edit="${p.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-remove="${p.id}">Deactivate</button>
          <button class="btn btn-sm btn-danger" data-delete="${p.id}">Delete</button>
        </td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openEdit(btn.dataset.edit))
    );
    body.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', () => removeProduct(btn.dataset.remove))
    );
    body.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteProductPermanently(btn.dataset.delete))
    );
  }

  // ---- Selling price live preview ----
  function recalcSellingPrice() {
    const method = document.querySelector('input[name="pricingMethod"]:checked').value;
    const purchasePrice = parseFloat(document.getElementById('p_purchasePrice').value) || 0;
    const markup = parseFloat(document.getElementById('p_markupPercentage').value) || 0;
    const sellingInput = document.getElementById('p_sellingPrice');
    const hint = document.getElementById('p_sellingPriceHint');

    if (method === 'Percentage Markup') {
      const selling = Math.round((purchasePrice + (purchasePrice * markup) / 100) * 100) / 100;
      sellingInput.value = selling;
      sellingInput.readOnly = true;
      hint.textContent = 'Auto-calculated from purchase price + markup.';
      document.getElementById('p_markupGroup').classList.remove('d-none');
    } else {
      sellingInput.readOnly = false;
      hint.textContent = 'Enter the fixed selling price manually.';
      document.getElementById('p_markupGroup').classList.add('d-none');
    }
  }

  document.getElementById('p_purchasePrice').addEventListener('input', recalcSellingPrice);
  document.getElementById('p_markupPercentage').addEventListener('input', recalcSellingPrice);
  document.querySelectorAll('input[name="pricingMethod"]').forEach((r) => r.addEventListener('change', recalcSellingPrice));

  // ---- Add / Edit modal ----
  document.getElementById('addBtn').addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('p_openingStockGroup').classList.remove('d-none');
    document.getElementById('p_markupPercentage').value = 20;
    recalcSellingPrice();
    modal.show();
  });

  async function openEdit(id) {
    try {
      const res = await apiRequest(`/products/${id}`);
      const p = res.data;
      editingId = id;
      document.getElementById('productModalTitle').textContent = `Edit ${p.name}`;
      document.getElementById('p_name').value = p.name;
      document.getElementById('p_sku').value = p.sku || '';
      document.getElementById('p_categoryId').value = p.categoryId || '';
      document.getElementById('p_brandId').value = p.brandId || '';
      document.getElementById('p_unitId').value = p.unitId || '';
      document.getElementById('p_description').value = p.description || '';
      document.getElementById('p_purchasePrice').value = p.purchasePrice;
      document.getElementById('p_markupPercentage').value = p.markupPercentage || 0;
      document.getElementById('p_sellingPrice').value = p.sellingPrice;
      document.getElementById('p_minimumStock').value = p.minimumStock || 0;
      document.getElementById('p_batchNumber').value = p.batchNumber || '';
      document.getElementById('p_expiryDate').value = p.expiryDate ? p.expiryDate.split('T')[0] : '';

      // Opening stock only applies at creation time, not editing.
      document.getElementById('p_openingStockGroup').classList.add('d-none');

      if (p.pricingMethod === 'Fixed Selling Price') {
        document.getElementById('p_methodFixed').checked = true;
      } else {
        document.getElementById('p_methodMarkup').checked = true;
      }
      recalcSellingPrice();
      if (p.pricingMethod === 'Fixed Selling Price') {
        document.getElementById('p_sellingPrice').value = p.sellingPrice;
      }

      modal.show();
    } catch (err) {
      showError(err);
    }
  }

  async function removeProduct(id) {
    if (!confirm('Deactivate this product?')) return;
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      loadProducts();
    } catch (err) {
      showError(err);
    }
  }

  async function deleteProductPermanently(id) {
    if (!confirm('Permanently delete this product? This cannot be undone. If it has any stock history, this will be blocked — deactivate it instead.')) return;
    try {
      await apiRequest(`/products/${id}/permanent`, { method: 'DELETE' });
      loadProducts();
    } catch (err) {
      showError(err);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      name: document.getElementById('p_name').value.trim(),
      sku: document.getElementById('p_sku').value.trim(),
      categoryId: document.getElementById('p_categoryId').value,
      brandId: document.getElementById('p_brandId').value,
      unitId: document.getElementById('p_unitId').value,
      description: document.getElementById('p_description').value.trim(),
      purchasePrice: parseFloat(document.getElementById('p_purchasePrice').value) || 0,
      pricingMethod: document.querySelector('input[name="pricingMethod"]:checked').value,
      markupPercentage: parseFloat(document.getElementById('p_markupPercentage').value) || 0,
      sellingPrice: parseFloat(document.getElementById('p_sellingPrice').value) || 0,
      minimumStock: parseFloat(document.getElementById('p_minimumStock').value) || 0,
      batchNumber: document.getElementById('p_batchNumber').value.trim(),
      expiryDate: document.getElementById('p_expiryDate').value
    };

    if (!editingId) {
      payload.openingStock = parseFloat(document.getElementById('p_openingStock').value) || 0;
    }

    try {
      if (editingId) {
        await apiRequest(`/products/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/products', { method: 'POST', body: payload });
      }
      modal.hide();
      loadProducts();
    } catch (err) {
      showError(err);
    }
  });

  // ---- Search ----
  let searchTimer = null;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadProducts(e.target.value.trim()), 300);
  });

  // ---- Init ----
  try {
    await loadLookups();
    await loadProducts();
  } catch (err) {
    showError(err);
  }
});
