/**
 * Builds printable delivery challan HTML and handles print / PDF export.
 */
function buildChallanDocumentHtml(challan, customerLabel, company = {}) {
  const companyName = company.companyName || 'Inventory ERP';
  const companyLines = [company.companyPhone, company.companyEmail, company.companyAddress]
    .filter(Boolean)
    .map((line) => escapeChallanHtml(line))
    .join('<br />');
  const footerNote = company.invoiceFooterNote || '';

  const rows = (challan.items || [])
    .map(
      (i) => `
    <tr>
      <td>${escapeChallanHtml(i.productName)}</td>
      <td class="num">${i.quantity}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Challan ${escapeChallanHtml(challan.id)}</title>
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
    .note { margin-top: 16px; font-size: 13px; color: #444; }
    .signatures { margin-top: 48px; display: flex; justify-content: space-between; }
    .signatures div { width: 40%; border-top: 1px solid #999; padding-top: 8px; font-size: 12px; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>DELIVERY CHALLAN</h1>
      <div class="meta"><strong>${escapeChallanHtml(companyName)}</strong>${companyLines ? `<br />${companyLines}` : ''}</div>
    </div>
    <div class="meta" style="text-align:right">
      <div><strong>Challan #:</strong> ${escapeChallanHtml(challan.id)}</div>
      <div><strong>Date:</strong> ${new Date(challan.challanDate).toLocaleString()}</div>
      <div><strong>Status:</strong> ${escapeChallanHtml(challan.status)}</div>
    </div>
  </div>
  <div class="meta">
    <strong>Deliver To:</strong> ${escapeChallanHtml(customerLabel)}<br />
    <strong>Linked Sale:</strong> ${challan.saleId ? escapeChallanHtml(challan.saleId) : 'Standalone delivery'}
  </div>
  <table>
    <thead>
      <tr><th>Product</th><th style="width:120px">Quantity</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${challan.note ? `<div class="note"><strong>Note:</strong> ${escapeChallanHtml(challan.note)}</div>` : ''}
  <div class="signatures">
    <div>Prepared By</div>
    <div>Received By</div>
  </div>
  ${footerNote ? `<div class="note">${escapeChallanHtml(footerNote)}</div>` : ''}
</body>
</html>`;
}

function escapeChallanHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printChallan(challan, customerLabel, company = {}) {
  const html = buildChallanDocumentHtml(challan, customerLabel, company);
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Please allow pop-ups to print the challan.');
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

async function downloadChallanPdf(challan, customerLabel, company = {}) {
  if (typeof html2pdf === 'undefined') {
    alert('PDF library is still loading. Please try again in a moment.');
    return;
  }
  const html = buildChallanDocumentHtml(challan, customerLabel, company);
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
        filename: `${challan.id}.pdf`,
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
