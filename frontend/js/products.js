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

  // ---- Bulk Import Excel Logic ----
  const importModalEl = document.getElementById('importModal');
  const importModal = new bootstrap.Modal(importModalEl);
  const importAlert = document.getElementById('importAlert');
  const importSuccessAlert = document.getElementById('importSuccessAlert');
  const excelFileInput = document.getElementById('excelFileInput');
  const previewContainer = document.getElementById('previewContainer');
  const previewTableBody = document.getElementById('importPreviewTableBody');
  const submitImportBtn = document.getElementById('submitImportBtn');
  const validRowCountBadge = document.getElementById('validRowCountBadge');
  const parsedRowCountSpan = document.getElementById('parsedRowCount');

  let validParsedRows = [];

  function showImportError(msg) {
    importAlert.textContent = msg;
    importAlert.classList.remove('d-none');
    importSuccessAlert.classList.add('d-none');
  }

  function clearImportAlerts() {
    importAlert.classList.add('d-none');
    importSuccessAlert.classList.add('d-none');
  }

  document.getElementById('importExcelBtn').addEventListener('click', () => {
    excelFileInput.value = '';
    previewContainer.classList.add('d-none');
    submitImportBtn.disabled = true;
    validParsedRows = [];
    clearImportAlerts();
    importModal.show();
  });

  // Download Sample Excel Template
  document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
      alert('Excel library not loaded. Please refresh your browser page.');
      return;
    }
    const sampleData = [
      {
        'Name': 'Wireless Ergonomic Mouse',
        'SKU': 'ELE-0010',
        'Category': 'Electronics',
        'Brand': 'Logitech',
        'Unit': 'Pcs',
        'Purchase Price': 500,
        'Selling Price': 650,
        'Minimum Stock': 5,
        'Opening Stock': 20,
        'Description': '2.4GHz optical wireless mouse'
      },
      {
        'Name': 'RGB Mechanical Keyboard',
        'SKU': 'ELE-0011',
        'Category': 'Electronics',
        'Brand': 'Logitech',
        'Unit': 'Pcs',
        'Purchase Price': 1500,
        'Selling Price': 1950,
        'Minimum Stock': 3,
        'Opening Stock': 10,
        'Description': 'Tactile mechanical switch keyboard'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products_import_template.xlsx');
  });

  // Read & Preview Uploaded Excel File
  excelFileInput.addEventListener('change', (e) => {
    clearImportAlerts();
    const file = e.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      showImportError('SheetJS library is loading or blocked. Please refresh the page.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          showImportError('The selected file contains no rows or readable data.');
          previewContainer.classList.add('d-none');
          submitImportBtn.disabled = true;
          return;
        }

        renderImportPreview(rawRows);
      } catch (err) {
        showImportError('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });

  function renderImportPreview(rows) {
    validParsedRows = [];
    previewTableBody.innerHTML = '';
    parsedRowCountSpan.textContent = rows.length;

    rows.forEach((row, idx) => {
      const name = (row.Name || row.name || row['Product Name'] || '').toString().trim();
      const sku = (row.SKU || row.sku || '').toString().trim();
      const category = (row.Category || row.category || '').toString().trim();
      const brand = (row.Brand || row.brand || '').toString().trim();
      const purchasePrice = parseFloat(row['Purchase Price'] ?? row.purchasePrice);
      const sellingPrice = parseFloat(row['Selling Price'] ?? row.sellingPrice);
      const openingStock = parseFloat(row['Opening Stock'] ?? row.openingStock) || 0;

      let isValid = true;
      let statusBadge = '<span class="badge bg-success">Ready</span>';

      if (!name) {
        isValid = false;
        statusBadge = '<span class="badge bg-danger">Missing Name</span>';
      } else if (isNaN(purchasePrice) || purchasePrice < 0) {
        isValid = false;
        statusBadge = '<span class="badge bg-danger">Invalid Price</span>';
      }

      if (isValid) {
        validParsedRows.push(row);
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${statusBadge}</td>
        <td class="fw-bold">${name || '<i class="text-muted">Empty</i>'}</td>
        <td>${sku || '<i class="text-muted">Auto</i>'}</td>
        <td>${category || '—'}</td>
        <td>${brand || '—'}</td>
        <td>${!isNaN(purchasePrice) ? '৳' + purchasePrice.toLocaleString() : '<span class="text-danger">Required</span>'}</td>
        <td>${!isNaN(sellingPrice) ? '৳' + sellingPrice.toLocaleString() : 'Auto Markup'}</td>
        <td>${openingStock}</td>
      `;
      previewTableBody.appendChild(tr);
    });

    validRowCountBadge.textContent = `${validParsedRows.length} Ready to Import`;
    previewContainer.classList.remove('d-none');
    submitImportBtn.disabled = validParsedRows.length === 0;
  }

  // Submit Bulk Import to Backend API
  submitImportBtn.addEventListener('click', async () => {
    if (validParsedRows.length === 0) return;
    clearImportAlerts();
    submitImportBtn.disabled = true;
    submitImportBtn.textContent = 'Importing...';

    try {
      const res = await apiRequest('/products/bulk-import', {
        method: 'POST',
        body: { products: validParsedRows }
      });

      const { insertedCount, skippedCount, errors } = res.data;
      importSuccessAlert.textContent = `Successfully imported ${insertedCount} products! ${skippedCount > 0 ? `(${skippedCount} skipped due to errors)` : ''}`;
      importSuccessAlert.classList.remove('d-none');

      if (errors && errors.length > 0) {
        const errMsgs = errors.map((e) => `Row ${e.row}: ${e.error}`).join('<br>');
        importAlert.innerHTML = `<b>Import Warnings:</b><br>${errMsgs}`;
        importAlert.classList.remove('d-none');
      }

      setTimeout(() => {
        importModal.hide();
        loadProducts();
      }, 1500);
    } catch (err) {
      showImportError(err.message || 'Bulk import failed.');
    } finally {
      submitImportBtn.disabled = false;
      submitImportBtn.textContent = 'Import Valid Products';
    }
  });

  // ---- Init ----
  try {
    await loadLookups();
    await loadProducts();
  } catch (err) {
    showError(err);
  }
});
