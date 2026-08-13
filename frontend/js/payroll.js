/**
 * Payroll UI — used on employees.html (Payroll tab) and payroll.html.
 */
function initPayroll({ showError, showSuccess, getEmployees }) {
  const form = document.getElementById('payrollForm');
  const bulkForm = document.getElementById('payrollBulkForm');
  if (!form) return;

  let payrollEmployeeSearch;
  let payrollRecords = [];
  let payrollDateFrom = '';
  let payrollDateTo = '';
  let payrollMonthFilter = '';

  function formatMoney(n) {
    return '৳' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function currentPayMonth() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  function formatPayMonthLabel(payMonth) {
    if (!payMonth || !/^\d{4}-\d{2}$/.test(payMonth)) return payMonth || '';
    const [year, month] = payMonth.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }
  function recalcNetPay() {
    const base = parseFloat(document.getElementById('payrollBaseSalary').value) || 0;
    const bonus = parseFloat(document.getElementById('payrollBonus').value) || 0;
    const deductions = parseFloat(document.getElementById('payrollDeductions').value) || 0;
    const net = Math.max(0, Math.round((base + bonus - deductions) * 100) / 100);
    document.getElementById('payrollNetPayLabel').textContent = formatMoney(net);
  }

  function updatePayrollEmployeeSearch(employees) {
    const active = employees.filter((e) => e.status === 'Active');
    const mount = document.getElementById('payrollEmployeeSearchMount');
    if (!payrollEmployeeSearch) {
      payrollEmployeeSearch = mountSearchSelect(mount, {
        items: active,
        placeholder: 'Search employee by name, designation...',
        required: true,
        getLabel: (e) => e.name,
        getValue: (e) => e.id,
        getSubLabel: (e) => [e.designation, e.phone].filter(Boolean).join(' · '),
        onSelect: (e) => {
          document.getElementById('payrollBaseSalary').value = e.salary || 0;
          recalcNetPay();
        }
      });
    } else {
      payrollEmployeeSearch.setItems(active);
    }
  }

  async function refreshEmployees() {
    const employees = getEmployees ? await getEmployees() : (await apiRequest('/employees?status=Active')).data;
    updatePayrollEmployeeSearch(employees);
    return employees;
  }

  async function loadPayrollHistory() {
    const res = await apiRequest('/payroll');
    payrollRecords = res.data;
    renderPayrollHistory();
  }

  function renderPayrollHistory() {
    const body = document.getElementById('payrollHistoryBody');
    const summaryEl = document.getElementById('payrollDateSummary');
    let filtered = payrollRecords.filter((r) => isDateInRange(r.paidDate, payrollDateFrom, payrollDateTo));
    if (payrollMonthFilter) {
      filtered = filtered.filter((r) => r.payMonth === payrollMonthFilter);
    }

    if (payrollDateFrom || payrollDateTo || payrollMonthFilter) {
      const totalNet = filtered.reduce((sum, r) => sum + Number(r.netPay || 0), 0);
      const parts = [];
      if (payrollMonthFilter) parts.push(formatPayMonthLabel(payrollMonthFilter));
      if (payrollDateFrom || payrollDateTo) parts.push(formatRangeLabel(payrollDateFrom, payrollDateTo));
      summaryEl.innerHTML =
        `<strong>${filtered.length}</strong> payment${filtered.length === 1 ? '' : 's'} — Total paid: <strong>${formatMoney(totalNet)}</strong>` +
        (parts.length ? ` <span class="text-muted">(${parts.join(' · ')})</span>` : '');
      summaryEl.classList.remove('d-none');
    } else {
      summaryEl.classList.add('d-none');
    }

    if (!filtered.length) {
      const msg = payrollRecords.length ? 'No payroll records match these filters.' : 'No payroll processed yet.';
      body.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">${msg}</td></tr>`;
      return;
    }

    body.innerHTML = filtered
      .map(
        (r) => `
      <tr>
        <td><code>${r.id}</code></td>
        <td>${formatPayMonthLabel(r.payMonth)}</td>
        <td>${r.employeeName}</td>
        <td>${formatMoney(r.baseSalary)}</td>
        <td>${formatMoney(r.bonus)}</td>
        <td>${formatMoney(r.deductions)}</td>
        <td class="fw-bold">${formatMoney(r.netPay)}</td>
        <td>${r.paymentMethod}</td>
      </tr>`
      )
      .join('');
  }

  ['payrollBaseSalary', 'payrollBonus', 'payrollDeductions'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', recalcNetPay);
  });

  const payMonthEl = document.getElementById('payrollPayMonth');
  const bulkMonthEl = document.getElementById('payrollBulkMonth');
  if (payMonthEl) payMonthEl.value = currentPayMonth();
  if (bulkMonthEl) bulkMonthEl.value = currentPayMonth();
  recalcNetPay();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeId = payrollEmployeeSearch?.getValue();
    if (!employeeId) {
      showError(new Error('Please select an employee.'));
      return;
    }
    try {
      const res = await apiRequest('/payroll', {
        method: 'POST',
        body: {
          employeeId,
          payMonth: document.getElementById('payrollPayMonth').value,
          baseSalary: parseFloat(document.getElementById('payrollBaseSalary').value) || 0,
          bonus: parseFloat(document.getElementById('payrollBonus').value) || 0,
          deductions: parseFloat(document.getElementById('payrollDeductions').value) || 0,
          paymentMethod: document.getElementById('payrollPaymentMethod').value,
          note: document.getElementById('payrollNote').value.trim()
        }
      });
      showSuccess(`Salary paid: ${res.data.employeeName} — ${formatMoney(res.data.netPay)} for ${formatPayMonthLabel(res.data.payMonth)}`);
      document.getElementById('payrollBonus').value = '0';
      document.getElementById('payrollDeductions').value = '0';
      document.getElementById('payrollNote').value = '';
      payrollEmployeeSearch.clear();
      document.getElementById('payrollBaseSalary').value = '0';
      recalcNetPay();
      loadPayrollHistory();
    } catch (err) {
      showError(err);
    }
  });

  bulkForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payMonth = document.getElementById('payrollBulkMonth').value;
    if (!confirm(`Process salary for all active employees for ${formatPayMonthLabel(payMonth)}?`)) return;
    try {
      const res = await apiRequest('/payroll/bulk', {
        method: 'POST',
        body: {
          payMonth,
          paymentMethod: document.getElementById('payrollBulkPaymentMethod').value,
          note: document.getElementById('payrollBulkNote').value.trim()
        }
      });
      const { created, skipped } = res.data;
      const total = created.reduce((sum, r) => sum + Number(r.netPay || 0), 0);
      showSuccess(
        `Bulk payroll: ${created.length} paid (${formatMoney(total)})` +
          (skipped.length ? `, ${skipped.length} skipped.` : '.')
      );
      loadPayrollHistory();
    } catch (err) {
      showError(err);
    }
  });

  bindDateRangeFilter('payrollDateFrom', 'payrollDateTo', 'payrollDateClear', (from, to) => {
    payrollDateFrom = from;
    payrollDateTo = to;
    renderPayrollHistory();
  });

  document.getElementById('payrollMonthFilter')?.addEventListener('change', (e) => {
    payrollMonthFilter = e.target.value;
    renderPayrollHistory();
  });

  document.getElementById('payrollMonthFilterClear')?.addEventListener('click', () => {
    payrollMonthFilter = '';
    const el = document.getElementById('payrollMonthFilter');
    if (el) el.value = '';
    renderPayrollHistory();
  });

  return {
    refreshEmployees,
    loadPayrollHistory,
    selectEmployee(id) {
      payrollEmployeeSearch?.setValue(id);
      const item = payrollEmployeeSearch?.getSelectedItem();
      if (item) {
        document.getElementById('payrollBaseSalary').value = item.salary || 0;
        recalcNetPay();
      }
    }
  };
}
