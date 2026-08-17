/**
 * Salary Slip Document Module for HR & Payroll.
 * IMPORTANT: Company logo is EXPLICITLY OMITTED per requirement ("Do not display the company logo on the salary slip").
 */

function escapeSlipHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSlipMoney(n, currency = '৳') {
  return currency + ' ' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSlipMonth(payMonth) {
  if (!payMonth || !/^\d{4}-\d{2}$/.test(payMonth)) return payMonth || '';
  const [year, month] = payMonth.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function buildSalarySlipHtml(salaryRecord, employee = {}, company = {}) {
  const currency = company.currencySymbol || '৳';
  const companyName = company.companyName || 'A&M TECH SOLUTIONS';
  const companyAddress = company.companyAddress || '';
  const companyPhone = company.companyPhone || '';
  const companyEmail = company.companyEmail || '';

  const employeeName = salaryRecord.employeeName || employee.name || '—';
  const employeeId = salaryRecord.employeeId || employee.id || '—';
  const departmentName = salaryRecord.departmentName || employee.departmentName || 'General';
  const designation = salaryRecord.designation || employee.designation || 'Staff';
  const payMonthLabel = formatSlipMonth(salaryRecord.payMonth);
  const paidDateLabel = salaryRecord.paidDate ? new Date(salaryRecord.paidDate).toLocaleString() : new Date().toLocaleString();

  // Earnings
  const basic = Number(salaryRecord.basicSalary || salaryRecord.baseSalary || 0);
  const houseRent = Number(salaryRecord.houseRent || 0);
  const medical = Number(salaryRecord.medical || 0);
  const transport = Number(salaryRecord.transport || 0);
  const food = Number(salaryRecord.food || 0);
  const overtime = Number(salaryRecord.overtime || 0);
  const festivalBonus = Number(salaryRecord.festivalBonus || salaryRecord.bonus || 0);
  const performanceBonus = Number(salaryRecord.performanceBonus || 0);
  const commission = Number(salaryRecord.commission || 0);
  const otherAllowance = Number(salaryRecord.otherAllowance || 0);

  const totalEarnings = salaryRecord.totalEarnings !== undefined
    ? Number(salaryRecord.totalEarnings)
    : basic + houseRent + medical + transport + food + overtime + festivalBonus + performanceBonus + commission + otherAllowance;

  // Deductions
  const absentDeduction = Number(salaryRecord.absentDeduction || 0);
  const lateDeduction = Number(salaryRecord.lateDeduction || 0);
  const advanceDeduction = Number(salaryRecord.advanceDeduction || 0);
  const loanDeduction = Number(salaryRecord.loanDeduction || 0);
  const taxDeduction = Number(salaryRecord.taxDeduction || 0);
  const insuranceDeduction = Number(salaryRecord.insuranceDeduction || 0);
  const otherDeductions = Number(salaryRecord.otherDeductions || salaryRecord.deductions || 0);

  const totalDeductions = salaryRecord.totalDeductions !== undefined
    ? Number(salaryRecord.totalDeductions)
    : absentDeduction + lateDeduction + advanceDeduction + loanDeduction + taxDeduction + insuranceDeduction + otherDeductions;

  const netSalary = salaryRecord.netSalary !== undefined
    ? Number(salaryRecord.netSalary)
    : (salaryRecord.netPay !== undefined ? Number(salaryRecord.netPay) : Math.max(0, totalEarnings - totalDeductions));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip ${escapeSlipHtml(employeeName)} - ${escapeSlipHtml(payMonthLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a202c;
      background: #fff;
      margin: 0;
      padding: 25px;
    }
    .slip-container {
      max-width: 700px;
      margin: 0 auto;
      border: 1px solid #cbd5e0;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.04);
    }
    .slip-header {
      text-align: center;
      border-bottom: 2px solid #2b6cb0;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .company-title {
      font-size: 22px;
      font-weight: 700;
      color: #2b6cb0;
      margin: 0;
    }
    .slip-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4a5568;
      margin-top: 4px;
    }
    .company-info {
      font-size: 12px;
      color: #718096;
      margin-top: 4px;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      background: #f7fafc;
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      margin-bottom: 18px;
      font-size: 13px;
    }
    .grid-info strong {
      color: #2d3748;
    }
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 13px;
    }
    .breakdown-table th {
      background: #2b6cb0;
      color: #fff;
      text-align: left;
      padding: 8px 12px;
      font-size: 12px;
      text-transform: uppercase;
    }
    .breakdown-table td {
      padding: 7px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .breakdown-table td.amount {
      text-align: right;
      font-weight: 600;
    }
    .two-col-tables {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .subtotal-row {
      background: #edf2f7;
      font-weight: 700;
    }
    .net-summary {
      background: #ebf8ff;
      border: 1px solid #bee3f8;
      padding: 14px 18px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .net-summary .label {
      font-size: 14px;
      font-weight: 700;
      color: #2b6cb0;
      text-transform: uppercase;
    }
    .net-summary .amount {
      font-size: 20px;
      font-weight: 800;
      color: #2b6cb0;
    }
    .slip-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #718096;
    }
    .signature-line {
      border-top: 1px dashed #718096;
      width: 160px;
      text-align: center;
      padding-top: 4px;
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
      .slip-container {
        border: none;
        box-shadow: none;
        width: 100%;
        max-width: 100%;
        padding: 0;
      }
      .btn, .modal-header, .modal-footer, .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="slip-container" id="printablePayslipArea">
    <!-- Notice: NO LOGO is rendered in accordance with requirement -->
    <div class="slip-header">
      <div class="company-title">${escapeSlipHtml(companyName)}</div>
      <div class="slip-title">Salary Slip &mdash; ${escapeSlipHtml(payMonthLabel)}</div>
      <div class="company-info">
        ${companyAddress ? `${escapeSlipHtml(companyAddress)} ` : ''}
        ${companyPhone ? `| Phone: ${escapeSlipHtml(companyPhone)} ` : ''}
        ${companyEmail ? `| Email: ${escapeSlipHtml(companyEmail)}` : ''}
      </div>
    </div>

    <div class="grid-info">
      <div><strong>Employee Name:</strong> ${escapeSlipHtml(employeeName)}</div>
      <div><strong>Employee ID:</strong> <code>${escapeSlipHtml(employeeId)}</code></div>
      <div><strong>Department:</strong> ${escapeSlipHtml(departmentName)}</div>
      <div><strong>Designation:</strong> ${escapeSlipHtml(designation)}</div>
      <div><strong>Pay Month:</strong> ${escapeSlipHtml(payMonthLabel)}</div>
      <div><strong>Payment Date:</strong> ${escapeSlipHtml(paidDateLabel)}</div>
    </div>

    <div class="two-col-tables">
      <div>
        <table class="breakdown-table">
          <thead>
            <tr><th>Earnings</th><th style="text-align:right">Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Basic Salary</td><td class="amount">${formatSlipMoney(basic, currency)}</td></tr>
            ${houseRent > 0 ? `<tr><td>House Rent Allowance</td><td class="amount">${formatSlipMoney(houseRent, currency)}</td></tr>` : ''}
            ${medical > 0 ? `<tr><td>Medical Allowance</td><td class="amount">${formatSlipMoney(medical, currency)}</td></tr>` : ''}
            ${transport > 0 ? `<tr><td>Transport Allowance</td><td class="amount">${formatSlipMoney(transport, currency)}</td></tr>` : ''}
            ${food > 0 ? `<tr><td>Food Allowance</td><td class="amount">${formatSlipMoney(food, currency)}</td></tr>` : ''}
            ${overtime > 0 ? `<tr><td>Overtime Pay</td><td class="amount">${formatSlipMoney(overtime, currency)}</td></tr>` : ''}
            ${festivalBonus > 0 ? `<tr><td>Festival Bonus</td><td class="amount">${formatSlipMoney(festivalBonus, currency)}</td></tr>` : ''}
            ${performanceBonus > 0 ? `<tr><td>Performance Bonus</td><td class="amount">${formatSlipMoney(performanceBonus, currency)}</td></tr>` : ''}
            ${commission > 0 ? `<tr><td>Sales Commission</td><td class="amount">${formatSlipMoney(commission, currency)}</td></tr>` : ''}
            ${otherAllowance > 0 ? `<tr><td>Other Allowances</td><td class="amount">${formatSlipMoney(otherAllowance, currency)}</td></tr>` : ''}
            <tr class="subtotal-row"><td>Total Earnings (A)</td><td class="amount">${formatSlipMoney(totalEarnings, currency)}</td></tr>
          </tbody>
        </table>
      </div>

      <div>
        <table class="breakdown-table">
          <thead>
            <tr><th>Deductions</th><th style="text-align:right">Amount</th></tr>
          </thead>
          <tbody>
            ${absentDeduction > 0 ? `<tr><td>Absent Deduction</td><td class="amount">${formatSlipMoney(absentDeduction, currency)}</td></tr>` : ''}
            ${lateDeduction > 0 ? `<tr><td>Late Deduction</td><td class="amount">${formatSlipMoney(lateDeduction, currency)}</td></tr>` : ''}
            ${advanceDeduction > 0 ? `<tr><td>Salary Advance</td><td class="amount">${formatSlipMoney(advanceDeduction, currency)}</td></tr>` : ''}
            ${loanDeduction > 0 ? `<tr><td>Loan Deduction</td><td class="amount">${formatSlipMoney(loanDeduction, currency)}</td></tr>` : ''}
            ${taxDeduction > 0 ? `<tr><td>Tax Deduction</td><td class="amount">${formatSlipMoney(taxDeduction, currency)}</td></tr>` : ''}
            ${insuranceDeduction > 0 ? `<tr><td>Insurance Deduction</td><td class="amount">${formatSlipMoney(insuranceDeduction, currency)}</td></tr>` : ''}
            ${otherDeductions > 0 ? `<tr><td>Other Deductions</td><td class="amount">${formatSlipMoney(otherDeductions, currency)}</td></tr>` : ''}
            ${totalDeductions === 0 ? `<tr><td style="color:#a0aec0">None</td><td class="amount">${formatSlipMoney(0, currency)}</td></tr>` : ''}
            <tr class="subtotal-row"><td>Total Deductions (B)</td><td class="amount">${formatSlipMoney(totalDeductions, currency)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="net-summary">
      <div>
        <div class="label">Net Salary Payable (A - B)</div>
        <div style="font-size:12px; color:#4a5568">Payment Method: <strong>${escapeSlipHtml(salaryRecord.paymentMethod || 'Cash')}</strong></div>
      </div>
      <div class="amount">${formatSlipMoney(netSalary, currency)}</div>
    </div>

    ${salaryRecord.note ? `<div style="font-size:12px; color:#718096; margin-bottom:15px;"><strong>Note:</strong> ${escapeSlipHtml(salaryRecord.note)}</div>` : ''}

    <div class="slip-footer">
      <div class="signature-line">Employee Signature</div>
      <div class="signature-line">Authorized Signature</div>
    </div>
  </div>
</body>
</html>`;
}

function printSalarySlip(salaryRecord, employee, company) {
  const html = buildSalarySlipHtml(salaryRecord, employee, company);
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Please allow pop-ups to print the salary slip.');
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

async function downloadSalarySlipPdf(salaryRecord, employee, company) {
  if (typeof html2pdf === 'undefined') {
    alert('PDF library is still loading. Please try again in a moment.');
    return;
  }
  const empName = salaryRecord.employeeName || 'Employee';
  const payMonth = salaryRecord.payMonth || 'Month';
  const html = buildSalarySlipHtml(salaryRecord, employee, company);

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-9999px;width:800px;height:1000px;border:0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise((r) => setTimeout(r, 300));

  try {
    const element = doc.getElementById('printablePayslipArea') || doc.body;
    await html2pdf()
      .set({
        margin: 10,
        filename: `Payslip_${empName.replace(/\s+/g, '_')}_${payMonth}.pdf`,
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

function sendSalarySlipWhatsApp(salaryRecord, employee, company) {
  const empName = salaryRecord.employeeName || 'Employee';
  const payMonth = formatSlipMonth(salaryRecord.payMonth);
  const net = formatSlipMoney(salaryRecord.netSalary || salaryRecord.netPay || 0, company.currencySymbol || '৳');
  const method = salaryRecord.paymentMethod || 'Cash';
  const phone = (employee.phone || '').replace(/[^\d+]/g, '');

  const text = encodeURIComponent(
    `Hello ${empName},\n\nYour salary slip for ${payMonth} has been processed.\n` +
    `Net Salary: ${net}\nPayment Method: ${method}\n\nThank you!`
  );

  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank');
}

async function showSalarySlipModal(salaryRecord, employee, company) {
  let modalEl = document.getElementById('salarySlipModal');
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="salarySlipModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="salarySlipModalTitle">Salary Slip</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="salarySlipModalBody" style="background:#f4f6f9; padding:20px;"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-success me-2" id="slipModalWhatsAppBtn">
                💬 Send WhatsApp
              </button>
              <button type="button" class="btn btn-outline-primary me-2" id="slipModalPdfBtn">
                📥 Download PDF
              </button>
              <button type="button" class="btn btn-primary" id="slipModalPrintBtn">
                🖨️ Print Slip
              </button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('salarySlipModal');
  }

  const empName = salaryRecord.employeeName || 'Employee';
  const payMonth = formatSlipMonth(salaryRecord.payMonth);
  document.getElementById('salarySlipModalTitle').textContent = `Salary Slip - ${empName} (${payMonth})`;

  const slipHtml = buildSalarySlipHtml(salaryRecord, employee, company);
  document.getElementById('salarySlipModalBody').innerHTML = slipHtml;

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  document.getElementById('slipModalPrintBtn').onclick = () => printSalarySlip(salaryRecord, employee, company);
  document.getElementById('slipModalPdfBtn').onclick = () => downloadSalarySlipPdf(salaryRecord, employee, company);
  document.getElementById('slipModalWhatsAppBtn').onclick = () => sendSalarySlipWhatsApp(salaryRecord, employee, company);
}
