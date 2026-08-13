/**
 * Builds printable purchase HTML and handles print / PDF export.
 */
function buildPurchaseDocumentHtml(purchase, supplierLabel, company = {}) {
  const currency = company.currencySymbol || '৳';
  const formatMoney = (n) =>
    currency + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const companyName = company.companyName || 'Inventory ERP';
  const companyLines = [company.companyPhone, company.companyEmail, company.companyAddress]
    .filter(Boolean)
    .map((line) => escapePurchaseHtml(line))
    .join('<br />');
  const footerNote = company.invoiceFooterNote || '';

  const rows = (purchase.items || [])
    .map(
      (i) => `
    <tr>
      <td>${escapePurchaseHtml(i.productName)}</td>
      <td class="num">${i.quantity}</td>
      <td class="num">${formatMoney(i.unitCost)}</td>
      <td class="num">${formatMoney(i.lineTotal)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Purchase ${escapePurchaseHtml(purchase.id)}</title>
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
      <h1>PURCHASE</h1>
      <div class="meta"><strong>${escapePurchaseHtml(companyName)}</strong>${companyLines ? `<br />${companyLines}` : ''}</div>
    </div>
    <div class="meta" style="text-align:right">
      <div><strong>Purchase #:</strong> ${escapePurchaseHtml(purchase.id)}</div>
      <div><strong>Date:</strong> ${new Date(purchase.purchaseDate).toLocaleString()}</div>
      <div><strong>Payment:</strong> ${escapePurchaseHtml(purchase.paymentMethod)}</div>
    </div>
  </div>
  <div class="meta">
    <strong>Supplier:</strong> ${escapePurchaseHtml(supplierLabel)}<br />
    <strong>Paid:</strong> ${formatMoney(purchase.amountPaid)} of ${formatMoney(purchase.total)}
  </div>
  <table>
    <thead>
      <tr><th>Product</th><th style="width:80px">Qty</th><th style="width:110px">Unit Cost</th><th style="width:110px">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="num">${formatMoney(purchase.subtotal)}</td></tr>
      <tr><td>Discount</td><td class="num">${formatMoney(purchase.discount)}</td></tr>
      <tr><td>Total</td><td class="num">${formatMoney(purchase.total)}</td></tr>
    </table>
  </div>
  ${purchase.note ? `<div class="note"><strong>Note:</strong> ${escapePurchaseHtml(purchase.note)}</div>` : ''}
  ${footerNote ? `<div class="note">${escapePurchaseHtml(footerNote)}</div>` : ''}
</body>
</html>`;
}

function escapePurchaseHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printPurchase(purchase, supplierLabel, company = {}) {
  const html = buildPurchaseDocumentHtml(purchase, supplierLabel, company);
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Please allow pop-ups to print the purchase.');
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

async function downloadPurchasePdf(purchase, supplierLabel, company = {}) {
  if (typeof html2pdf === 'undefined') {
    alert('PDF library is still loading. Please try again in a moment.');
    return;
  }
  const html = buildPurchaseDocumentHtml(purchase, supplierLabel, company);
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
        filename: `${purchase.id}.pdf`,
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
