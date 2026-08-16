/**
 * Builds printable invoice HTML and handles print / PDF export.
 */
function buildInvoiceDocumentHtml(sale, customer, company = {}) {
  const currency = company.currencySymbol || '৳';
  const formatMoney = (n) =>
    currency + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const companyName = company.companyName || 'Inventory ERP';
  const companyLines = [company.companyPhone, company.companyEmail, company.companyAddress]
    .filter(Boolean)
    .map((line) => escapeInvoiceHtml(line))
    .join('<br />');
  const footerNote = company.invoiceFooterNote || '';

  const customerName = typeof customer === 'object' && customer !== null ? customer.name : (customer || '—');
  const customerAddress = typeof customer === 'object' && customer !== null ? customer.address : '';
  const customerPhone = typeof customer === 'object' && customer !== null ? customer.phone : '';

  const rows = (sale.items || [])
    .map(
      (i) => `
    <tr>
      <td>${escapeInvoiceHtml(i.productName)}</td>
      <td class="num">${i.quantity}</td>
      <td class="num">${formatMoney(i.unitPrice)}</td>
      <td class="num">${formatMoney(i.lineTotal)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${escapeInvoiceHtml(sale.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #2f6fed; padding-bottom: 16px; }
    .header h1 { margin: 0 0 4px; font-size: 22px; color: #2f6fed; }
    .meta { font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; font-size: 13px; }
    th { background: #f4f6f9; text-align: left; }
    td.num { text-align: right; }
    tfoot td { font-weight: bold; }
    .totals { margin-top: 8px; width: 280px; margin-left: auto; }
    .totals table { border: none; }
    .totals td { border: none; padding: 4px 0; }
    .note { margin-top: 16px; font-size: 13px; color: #444; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <div class="meta"><strong>${escapeInvoiceHtml(companyName)}</strong>${companyLines ? `<br />${companyLines}` : ''}</div>
    </div>
    <div class="meta" style="text-align:right">
      <div><strong>Invoice #:</strong> ${escapeInvoiceHtml(sale.id)}</div>
      <div><strong>Date:</strong> ${new Date(sale.saleDate).toLocaleString()}</div>
      <div><strong>Payment:</strong> ${escapeInvoiceHtml(sale.paymentMethod)}</div>
    </div>
  </div>
  <div class="meta">
    <strong>Bill To:</strong> ${escapeInvoiceHtml(customerName)}<br />
    ${customerAddress ? `<strong>Address:</strong> ${escapeInvoiceHtml(customerAddress)}<br />` : ''}
    ${customerPhone ? `<strong>Phone:</strong> ${escapeInvoiceHtml(customerPhone)}<br />` : ''}
    <strong>Paid:</strong> ${formatMoney(sale.amountPaid)} of ${formatMoney(sale.total)}
  </div>
  <table>
    <thead>
      <tr><th>Product</th><th style="width:80px">Qty</th><th style="width:110px">Unit Price</th><th style="width:110px">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="num">${formatMoney(sale.subtotal)}</td></tr>
      <tr><td>Discount</td><td class="num">${formatMoney(sale.discount)}</td></tr>
      <tr><td>Total</td><td class="num">${formatMoney(sale.total)}</td></tr>
    </table>
  </div>
  ${sale.note ? `<div class="note"><strong>Note:</strong> ${escapeInvoiceHtml(sale.note)}</div>` : ''}
  ${footerNote ? `<div class="note">${escapeInvoiceHtml(footerNote)}</div>` : ''}
</body>
</html>`;
}

function escapeInvoiceHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPosReceiptHtml(sale, customer, company = {}) {
  const currency = company.currencySymbol || '৳';
  const formatMoney = (n) =>
    currency + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const companyName = company.companyName || 'Inventory ERP';
  const companyLines = [company.companyAddress, company.companyPhone, company.companyEmail]
    .filter(Boolean)
    .map((line) => escapeInvoiceHtml(line))
    .join('<br />');
  const footerNote = company.invoiceFooterNote || 'Thank you for your business!';

  const customerName = typeof customer === 'object' && customer !== null ? customer.name : (customer || 'Walk-in Customer');
  const customerAddress = typeof customer === 'object' && customer !== null ? customer.address : '';
  const customerPhone = typeof customer === 'object' && customer !== null ? customer.phone : '';

  const due = Math.max(0, (sale.total || 0) - (sale.amountPaid || 0));

  const itemsHtml = (sale.items || [])
    .map(
      (i) => `
    <tr>
      <td colspan="3" style="font-weight:600; padding-top:4px;">${escapeInvoiceHtml(i.productName)}</td>
    </tr>
    <tr style="border-bottom:1px dotted #ccc;">
      <td style="color:#555; padding-bottom:4px;">${i.quantity} x ${formatMoney(i.unitPrice)}</td>
      <td></td>
      <td style="text-align:right; font-weight:600; padding-bottom:4px;">${formatMoney(i.lineTotal)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>POS Receipt ${escapeInvoiceHtml(sale.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      margin: 0 auto;
      padding: 12px;
      max-width: 320px;
    }
    .text-center { text-align: center; }
    .text-end { text-align: right; }
    .fw-bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .divider-double { border-top: 2px dashed #000; margin: 8px 0; }
    .store-title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .receipt-title { font-size: 13px; font-weight: bold; letter-spacing: 1px; margin: 4px 0; }
    .meta-table, .items-table, .totals-table { width: 100%; border-collapse: collapse; }
    .meta-table td, .totals-table td { padding: 2px 0; font-size: 12px; }
    .items-table td { font-size: 12px; }
    .totals-table td.num { text-align: right; }
    .grand-total { font-size: 14px; font-weight: bold; }
    .footer { margin-top: 12px; font-size: 11px; text-align: center; }
    @media print {
      body { width: 80mm; max-width: 80mm; padding: 4mm; margin: 0; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="store-title">${escapeInvoiceHtml(companyName)}</div>
    ${companyLines ? `<div>${companyLines}</div>` : ''}
    <div class="receipt-title">POS RECEIPT</div>
  </div>

  <div class="divider"></div>

  <table class="meta-table">
    <tr><td><strong>Receipt #:</strong></td><td class="text-end">${escapeInvoiceHtml(sale.id)}</td></tr>
    <tr><td><strong>Date:</strong></td><td class="text-end">${new Date(sale.saleDate).toLocaleString()}</td></tr>
    <tr><td><strong>Payment:</strong></td><td class="text-end">${escapeInvoiceHtml(sale.paymentMethod)}</td></tr>
  </table>

  <div class="divider"></div>

  <table class="meta-table">
    <tr><td><strong>Bill To:</strong></td><td class="text-end">${escapeInvoiceHtml(customerName)}</td></tr>
    ${customerAddress ? `<tr><td><strong>Address:</strong></td><td class="text-end">${escapeInvoiceHtml(customerAddress)}</td></tr>` : ''}
    ${customerPhone ? `<tr><td><strong>Phone:</strong></td><td class="text-end">${escapeInvoiceHtml(customerPhone)}</td></tr>` : ''}
  </table>

  <div class="divider"></div>

  <table class="items-table">
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th style="text-align:left; padding-bottom:4px;">Item</th>
        <th></th>
        <th style="text-align:right; padding-bottom:4px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <table class="totals-table">
    <tr><td>Subtotal:</td><td class="num">${formatMoney(sale.subtotal)}</td></tr>
    <tr><td>Discount:</td><td class="num">${formatMoney(sale.discount)}</td></tr>
    <tr class="grand-total"><td style="padding-top:4px;">TOTAL:</td><td class="num" style="padding-top:4px;">${formatMoney(sale.total)}</td></tr>
    <tr><td>Paid:</td><td class="num">${formatMoney(sale.amountPaid)}</td></tr>
    ${due > 0 ? `<tr><td><strong>Due:</strong></td><td class="num"><strong>${formatMoney(due)}</strong></td></tr>` : ''}
  </table>

  ${sale.note ? `<div class="divider"></div><div><strong>Note:</strong> ${escapeInvoiceHtml(sale.note)}</div>` : ''}

  <div class="divider-double"></div>

  <div class="footer">
    <div>${escapeInvoiceHtml(footerNote)}</div>
    <div style="margin-top:4px; font-size:10px; color:#666;">*** Thank You ***</div>
  </div>
</body>
</html>`;
}

function printPosReceipt(sale, customer, company = {}) {
  const html = buildPosReceiptHtml(sale, customer, company);
  const win = window.open('', '_blank', 'width=400,height=700');
  if (!win) {
    alert('Please allow pop-ups to print the POS receipt.');
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

function printInvoice(sale, customer, company = {}) {
  const html = buildInvoiceDocumentHtml(sale, customer, company);
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Please allow pop-ups to print the invoice.');
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

async function downloadInvoicePdf(sale, customer, company = {}) {
  if (typeof html2pdf === 'undefined') {
    alert('PDF library is still loading. Please try again in a moment.');
    return;
  }
  const html = buildInvoiceDocumentHtml(sale, customer, company);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-9999px;width:800px;height:1100px;border:0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise((r) => setTimeout(r, 300));

  try {
    await html2pdf()
      .set({
        margin: 10,
        filename: `${sale.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(frame.contentDocument.body)
      .save();
  } finally {
    frame.remove();
  }
}
