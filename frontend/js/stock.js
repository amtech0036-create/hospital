document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/stock.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Stock';

  const alertBox = document.getElementById('stockAlert');

  function showError(err) {
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }
  function clearError() {
    alertBox.classList.add('d-none');
  }

  // ---- Tabs ----
  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
    });
  });

  // ---- Low stock ----
  async function loadLowStock() {
    try {
      const res = await apiRequest('/stock/low-stock');
      const body = document.getElementById('lowStockBody');
      if (!res.data.length) {
        body.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nothing is below its minimum stock level.</td></tr>';
        return;
      }
      body.innerHTML = res.data
        .map(
          (p) => `
        <tr>
          <td>${p.sku || ''}</td>
          <td>${p.name}</td>
          <td class="text-danger fw-bold">${p.currentStock}</td>
          <td>${p.minimumStock}</td>
        </tr>`
        )
        .join('');
    } catch (err) {
      showError(err);
    }
  }
  loadLowStock();

  // ---- Adjustment form ----
  document.getElementById('adjustForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    try {
      await apiRequest('/stock', {
        method: 'POST',
        body: {
          productId: document.getElementById('adjProductId').value.trim(),
          type: document.getElementById('adjType').value,
          quantity: parseFloat(document.getElementById('adjQuantity').value),
          note: document.getElementById('adjNote').value.trim()
        }
      });
      document.getElementById('adjustForm').reset();
      loadLowStock();
      alert('Stock transaction saved.');
    } catch (err) {
      showError(err);
    }
  });

  // ---- History ----
  document.getElementById('loadHistoryBtn').addEventListener('click', async () => {
    clearError();
    const productId = document.getElementById('historyProductId').value.trim();
    if (!productId) return;

    try {
      const [historyRes, currentRes] = await Promise.all([
        apiRequest(`/stock/${productId}/history`),
        apiRequest(`/stock/${productId}/current`)
      ]);

      document.getElementById('currentStockLabel').textContent = `Current stock: ${currentRes.data.currentStock}`;

      const body = document.getElementById('historyBody');
      if (!historyRes.data.length) {
        body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No transactions for this product yet.</td></tr>';
        return;
      }
      body.innerHTML = historyRes.data
        .map(
          (t) => `
        <tr>
          <td>${new Date(t.transactionDate).toLocaleString()}</td>
          <td>${t.type}</td>
          <td>${t.quantity}</td>
          <td>${t.referenceType || ''} ${t.referenceId || ''}</td>
          <td>${t.note || ''}</td>
        </tr>`
        )
        .join('');
    } catch (err) {
      showError(err);
    }
  });
});
