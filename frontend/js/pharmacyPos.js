document.addEventListener('DOMContentLoaded', async () => {
  const rxLookupInput = document.getElementById('rxLookupInput');
  const loadRxBtn = document.getElementById('loadRxBtn');
  const rxBanner = document.getElementById('rxBanner');
  const pharmacyCartBody = document.getElementById('pharmacyCartBody');
  const posSubtotal = document.getElementById('posSubtotal');
  const posDiscount = document.getElementById('posDiscount');
  const posNetTotal = document.getElementById('posNetTotal');
  const posPaymentMethod = document.getElementById('posPaymentMethod');
  const posPaidAmount = document.getElementById('posPaidAmount');
  const posCheckoutBtn = document.getElementById('posCheckoutBtn');
  const pharmacyAlert = document.getElementById('pharmacyAlert');

  let cartItems = [];
  let currentPrescription = null;
  let allProducts = [];

  function showAlert(msg, isErr = true) {
    pharmacyAlert.classList.remove('d-none', 'alert-danger', 'alert-success');
    pharmacyAlert.classList.add(isErr ? 'alert-danger' : 'alert-success');
    pharmacyAlert.textContent = msg;
  }

  try {
    const res = await apiRequest('/products?status=Active');
    allProducts = res.data || res;
  } catch (err) {
    console.error('Failed to load products:', err);
  }

  function renderCart() {
    if (cartItems.length === 0) {
      pharmacyCartBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Cart is empty.</td></tr>';
      posSubtotal.textContent = '0.00 BDT';
      posNetTotal.textContent = '0.00 BDT';
      posCheckoutBtn.disabled = true;
      return;
    }

    pharmacyCartBody.innerHTML = '';
    let sub = 0;

    cartItems.forEach((item, index) => {
      const itemSub = (item.quantity || 1) * (item.unitPrice || 0);
      sub += itemSub;

      const row = `
        <tr>
          <td class="ps-3">
            <div class="fw-bold">${item.productName}</div>
            <small class="text-muted">Generic: ${item.genericName || 'N/A'}</small>
          </td>
          <td><span class="badge bg-secondary">${item.availableStock || 0}</span></td>
          <td>
            <input type="number" class="form-control form-control-sm item-qty" data-index="${index}" value="${item.quantity || 1}" min="1" max="${item.availableStock || 999}" />
          </td>
          <td>${item.unitPrice.toFixed(2)} BDT</td>
          <td class="fw-bold text-primary">${itemSub.toFixed(2)} BDT</td>
          <td class="text-end pe-3">
            <button class="btn btn-sm btn-outline-danger remove-cart-item" data-index="${index}"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
      pharmacyCartBody.insertAdjacentHTML('beforeend', row);
    });

    const disc = Number(posDiscount.value) || 0;
    const net = Math.max(0, sub - disc);

    posSubtotal.textContent = `${sub.toFixed(2)} BDT`;
    posNetTotal.textContent = `${net.toFixed(2)} BDT`;
    if (!posPaidAmount.value || Number(posPaidAmount.value) === 0) {
      posPaidAmount.value = net.toFixed(2);
    }

    posCheckoutBtn.disabled = false;

    // Attach row events
    document.querySelectorAll('.item-qty').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = e.target.getAttribute('data-index');
        cartItems[idx].quantity = Number(e.target.value) || 1;
        renderCart();
      });
    });

    document.querySelectorAll('.remove-cart-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        cartItems.splice(idx, 1);
        renderCart();
      });
    });
  }

  // Load Prescription Cart
  loadRxBtn.addEventListener('click', async () => {
    const rxNo = rxLookupInput.value.trim();
    if (!rxNo) return;
    try {
      const res = await apiRequest(`/pharmacy/prescriptions/${rxNo}`);
      const data = res.data || res;
      currentPrescription = data;

      document.getElementById('rxNumberText').textContent = data.prescriptionNumber;
      document.getElementById('rxPatientText').textContent = data.patientName;
      document.getElementById('rxDoctorText').textContent = data.doctorName;
      document.getElementById('rxDiagnosisText').textContent = data.diagnosis;
      rxBanner.classList.remove('d-none');

      cartItems = (data.cartItems || []).map((ci) => ({
        productId: ci.matchedProductId || (allProducts[0] ? allProducts[0].id : 'PROD-000001'),
        productName: ci.productName,
        genericName: ci.genericName,
        quantity: 10,
        unitPrice: ci.unitPrice || 5,
        availableStock: ci.availableStock || 100
      }));

      renderCart();
    } catch (err) {
      showAlert('Failed to load prescription: ' + err.message);
    }
  });

  posDiscount.addEventListener('input', renderCart);

  // Add Manual Medicine Item Form
  const manualItemForm = document.getElementById('manualItemForm');
  if (manualItemForm) {
    manualItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const productName = document.getElementById('manualName').value.trim();
      const genericName = document.getElementById('manualGeneric').value.trim();
      const batchNumber = document.getElementById('manualBatch').value.trim() || 'MANUAL-BATCH';
      const expiryDate = document.getElementById('manualExpiry').value || '2028-12-31';
      const quantity = Number(document.getElementById('manualQty').value) || 1;
      const unitPrice = Number(document.getElementById('manualPrice').value) || 10;
      const taxPct = Number(document.getElementById('manualTax').value) || 0;

      const manualItem = {
        productId: allProducts[0] ? allProducts[0].id : 'PROD-000001',
        productName,
        genericName,
        batchNumber,
        expiryDate,
        quantity,
        unitPrice: unitPrice + (unitPrice * (taxPct / 100)),
        availableStock: 999
      };

      cartItems.push(manualItem);
      renderCart();

      const modalEl = document.getElementById('manualItemModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      manualItemForm.reset();
    });
  }

  // Complete FEFO Sale
  posCheckoutBtn.addEventListener('click', async () => {
    if (cartItems.length === 0) return;
    try {
      const res = await apiRequest('/pharmacy/sales', {
        method: 'POST',
        body: JSON.stringify({
          patientId: currentPrescription ? currentPrescription.patientId : null,
          prescriptionId: currentPrescription ? currentPrescription.prescriptionNumber : null,
          items: cartItems,
          paymentMethod: posPaymentMethod.value,
          discountAmount: Number(posDiscount.value) || 0,
          paidAmount: Number(posPaidAmount.value) || 0
        })
      });

      const sale = res.data || res;
      showAlert(`Pharmacy FEFO Sale Completed! Invoice #${sale.invoiceNumber}`, false);
      cartItems = [];
      rxBanner.classList.add('d-none');
      renderCart();
    } catch (err) {
      showAlert('Checkout failed: ' + err.message);
    }
  });
});
