/**
 * Payment Receipt Document module for Customer Due Payments.
 */

function escapeReceiptHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPaymentReceiptHtml(payment, customer = {}, company = {}) {
  const currency = company.currencySymbol || '৳';
  const formatMoney = (n) =>
    currency + ' ' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const companyName = company.companyName || 'A&M TECH SOLUTIONS';
  const companyAddress = company.companyAddress || '';
  const companyPhone = company.companyPhone || '';
  const companyEmail = company.companyEmail || '';

  const customerName = typeof customer === 'object' && customer !== null ? customer.name : (customer || '—');
  const customerId = typeof customer === 'object' && customer !== null ? customer.id : '—';
  const customerPhone = typeof customer === 'object' && customer !== null ? customer.phone : '—';
  const customerAddress = typeof customer === 'object' && customer !== null ? customer.address : '—';

  const receiptNo = payment.receiptNumber || payment.id || 'RP-000000';
  const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleString() : new Date().toLocaleString();
  const invoiceNo = payment.referenceId || (payment.referenceType === 'Invoice' ? payment.referenceId : '') || 'N/A';
  
  const previousDue = payment.previousDue !== undefined && payment.previousDue !== '' ? payment.previousDue : '—';
  const paidAmount = payment.amount || 0;
  const remainingDue = payment.remainingDue !== undefined && payment.remainingDue !== '' ? payment.remainingDue : '—';
  const paymentMethod = payment.paymentMethod || 'Cash';
  const receivedBy = payment.employeeId || payment.createdBy || 'Authorized Staff';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${escapeReceiptHtml(receiptNo)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #222;
      background: #fff;
      margin: 0;
      padding: 30px;
    }
    .receipt-container {
      max-width: 650px;
      margin: 0 auto;
      border: 1px solid #e0e0e0;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .receipt-header {
      text-align: center;
      border-bottom: 2px dashed #333;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .company-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a365d;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .receipt-title {
      font-size: 15px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4a5568;
      margin-top: 4px;
    }
    .company-info {
      font-size: 12px;
      color: #555;
      margin-top: 4px;
      line-height: 1.4;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 20px;
      border: 1px solid #edf2f7;
    }
    .meta-bar strong {
      color: #2d3748;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      color: #2b6cb0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
      margin-top: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
      font-size: 13px;
      margin-bottom: 15px;
    }
    .info-item {
      display: flex;
    }
    .info-label {
      width: 100px;
      color: #718096;
      font-weight: 500;
    }
    .info-value {
      font-weight: 600;
      color: #1a202c;
    }
    .table-details {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    .table-details th {
      background: #edf2f7;
      text-align: left;
      padding: 8px 12px;
      font-size: 12px;
      text-transform: uppercase;
      color: #4a5568;
    }
    .table-details td {
      padding: 10px 12px;
      font-size: 13px;
      border-bottom: 1px solid #edf2f7;
    }
    .table-details td.amount {
      text-align: right;
      font-weight: 600;
    }
    .amount-highlight {
      color: #2b6cb0;
      font-size: 15px;
      font-weight: 700;
    }
    .remaining-highlight {
      color: #c53030;
      font-weight: 700;
    }
    .receipt-footer {
      text-align: center;
      border-top: 2px dashed #333;
      padding-top: 15px;
      margin-top: 25px;
      font-size: 13px;
      color: #4a5568;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 15mm;
      }
      body {
        padding: 0;
        background: #fff;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
        width: 100%;
        max-width: 100%;
        padding: 0;
      }
      /* Hide all ERP layout items during printing */
      .erp-sidebar, .erp-topbar, #erpSidebar, #erpTopbar, .nav-tabs, .btn, .modal-header, .modal-footer, .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container" id="printableReceiptArea">
    <div class="receipt-header">
      <div class="company-title">${escapeReceiptHtml(companyName)}</div>
      <div class="receipt-title">Customer Due Payment Receipt</div>
      <div class="company-info">
        ${companyAddress ? `${escapeReceiptHtml(companyAddress)}<br />` : ''}
        ${companyPhone ? `Phone: ${escapeReceiptHtml(companyPhone)} ` : ''}
        ${companyEmail ? `| Email: ${escapeReceiptHtml(companyEmail)}` : ''}
      </div>
    </div>

    <div class="meta-bar">
      <div><strong>Receipt No:</strong> <code>${escapeReceiptHtml(receiptNo)}</code></div>
      <div><strong>Date:</strong> ${escapeReceiptHtml(paymentDate)}</div>
    </div>

    <div class="section-title">Customer Information</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span> <span class="info-value">${escapeReceiptHtml(customerName)}</span></div>
      <div class="info-item"><span class="info-label">Customer ID:</span> <span class="info-value">${escapeReceiptHtml(customerId)}</span></div>
      <div class="info-item"><span class="info-label">Phone:</span> <span class="info-value">${escapeReceiptHtml(customerPhone)}</span></div>
      <div class="info-item"><span class="info-label">Address:</span> <span class="info-value">${escapeReceiptHtml(customerAddress)}</span></div>
    </div>

    <div class="section-title">Payment Details</div>
    <table class="table-details">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceNo !== 'N/A' ? `<tr><td>Invoice Reference</td><td class="amount">${escapeReceiptHtml(invoiceNo)}</td></tr>` : ''}
        <tr>
          <td>Previous Due Amount</td>
          <td class="amount">${previousDue !== '—' ? formatMoney(previousDue) : '—'}</td>
        </tr>
        <tr>
          <td><strong>Paid Amount</strong></td>
          <td class="amount amount-highlight">${formatMoney(paidAmount)}</td>
        </tr>
        <tr>
          <td>Remaining Due Amount</td>
          <td class="amount remaining-highlight">${remainingDue !== '—' ? formatMoney(remainingDue) : '—'}</td>
        </tr>
        <tr>
          <td>Payment Method</td>
          <td class="amount">${escapeReceiptHtml(paymentMethod)}</td>
        </tr>
        <tr>
          <td>Received By (Employee)</td>
          <td class="amount">${escapeReceiptHtml(receivedBy)}</td>
        </tr>
      </tbody>
    </table>

    ${payment.note ? `<div style="font-size:12px; color:#666; margin-bottom:15px;"><strong>Note:</strong> ${escapeReceiptHtml(payment.note)}</div>` : ''}

    <div class="receipt-footer">
      <strong>Thank you for your payment!</strong>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Trigger immediate printing of the receipt.
 */
function printPaymentReceipt(payment, customer, company) {
  const html = buildPaymentReceiptHtml(payment, customer, company);
  const win = window.open('', '_blank', 'width=750,height=900');
  if (!win) {
    alert('Please allow pop-ups to print the receipt.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
}

/**
 * Generate and download PDF for the receipt.
 */
async function downloadPaymentReceiptPdf(payment, customer, company) {
  if (typeof html2pdf === 'undefined') {
    alert('PDF library is still loading. Please try again in a moment.');
    return;
  }
  const receiptNo = payment.receiptNumber || payment.id || 'Receipt';
  const html = buildPaymentReceiptHtml(payment, customer, company);

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-9999px;width:750px;height:1000px;border:0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise((r) => setTimeout(r, 300));

  try {
    const element = doc.getElementById('printableReceiptArea') || doc.body;
    await html2pdf()
      .set({
        margin: 10,
        filename: `${receiptNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(element)
      .save();
  } finally {
    frame.remove();
  }
}

/**
 * Displays a Bootstrap modal showing the preview of the receipt with Print and PDF buttons.
 */
async function showPaymentReceiptModal(payment, customer, company) {
  let modalEl = document.getElementById('paymentReceiptModal');
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="paymentReceiptModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="paymentReceiptModalTitle">Customer Payment Receipt</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="paymentReceiptModalBody" style="background:#f4f6f9; padding:20px;"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary me-2" id="receiptModalPrintBtn">
                🖨️ Print Receipt
              </button>
              <button type="button" class="btn btn-success" id="receiptModalPdfBtn">
                📥 Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('paymentReceiptModal');
  }

  const receiptNo = payment.receiptNumber || payment.id || 'RP-000000';
  document.getElementById('paymentReceiptModalTitle').textContent = `Customer Payment Receipt (${receiptNo})`;
  
  const receiptHtml = buildPaymentReceiptHtml(payment, customer, company);
  document.getElementById('paymentReceiptModalBody').innerHTML = receiptHtml;

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  document.getElementById('receiptModalPrintBtn').onclick = () => {
    printPaymentReceipt(payment, customer, company);
  };
  document.getElementById('receiptModalPdfBtn').onclick = () => {
    downloadPaymentReceiptPdf(payment, customer, company);
  };
}
