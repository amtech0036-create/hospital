/**
 * Payroll helper for Employees section (employees.html Payroll tab).
 */
function initPayroll({ showError, showSuccess, getEmployees }) {
  const form = document.getElementById('payrollForm');
  const bulkForm = document.getElementById('payrollBulkForm');
  if (!form) return null;

  let payrollEmployeeSearch = null;
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
    const base = parseFloat(document.getElementById('payrollBaseSalary')?.value) || 0;
    const bonus = parseFloat(document.getElementById('payrollBonus')?.value) || 0;
    const deductions = parseFloat(document.getElementById('payrollDeductions')?.value) || 0;
    const net = Math.max(0, Math.round((base + bonus - deductions) * 100) / 100);
    const label = document.getElementById('payrollNetPayLabel');
    if (label) label.textContent = formatMoney(net);
  }

  async function fetchAndCalcAbsentDeduction(employeeId) {
    if (!employeeId) return;
    const payMonth = document.getElementById('payrollPayMonth')?.value;
    try {
      const attRes = await apiRequest('/attendance');
      const records = attRes.data || [];
      const empAtt = records.filter((a) => a.employeeId === employeeId && (!payMonth || (a.date && a.date.startsWith(payMonth))));
      const absentCount = empAtt.filter((a) => a.status === 'Absent' || a.attendanceStatus === 'Absent').length;

      const baseSalary = parseFloat(document.getElementById('payrollBaseSalary')?.value) || 0;
      const perDaySalary = baseSalary > 0 ? baseSalary / 30 : 0;
      const absentDeduction = Math.max(0, Math.round(perDaySalary * absentCount * 100) / 100);

      const deductionsEl = document.getElementById('payrollDeductions');
      if (deductionsEl && absentDeduction > 0) {
        deductionsEl.value = absentDeduction;
      }
      recalcNetPay();
    } catch (err) {
      console.warn('Failed to fetch attendance absent count in employeePayroll', err);
    }
  }

  function updatePayrollEmployeeSearch(employees) {
    const active = (employees || []).filter((e) => e.status === 'Active');
    const mount = document.getElementById('payrollEmployeeSearchMount');
    if (!mount) return;

    if (!payrollEmployeeSearch && typeof mountSearchSelect === 'function') {
      payrollEmployeeSearch = mountSearchSelect(mount, {
        items: active,
        placeholder: 'Search employee by name, designation...',
        required: true,
        getLabel: (e) => e.name,
        getValue: (e) => e.id,
        getSubLabel: (e) => [e.designation, e.phone].filter(Boolean).join(' · '),
        onSelect: async (e) => {
          const baseSalaryEl = document.getElementById('payrollBaseSalary');
          if (baseSalaryEl) baseSalaryEl.value = e.salary || 0;
          await fetchAndCalcAbsentDeduction(e.id);
          recalcNetPay();
        }
      });
    } else if (payrollEmployeeSearch) {
      payrollEmployeeSearch.setItems(active);
    }
  }

  async function refreshEmployees() {
    try {
      const employees = getEmployees ? await getEmployees() : (await apiRequest('/employees?status=Active')).data;
      updatePayrollEmployeeSearch(employees);
      return employees;
    } catch (err) {
      if (showError) showError(err);
      return [];
    }
  }

  async function loadPayrollHistory() {
    try {
      const res = await apiRequest('/payroll');
      payrollRecords = res.data || [];
      renderPayrollHistory();
    } catch (err) {
      if (showError) showError(err);
    }
  }

  function renderPayrollHistory() {
    const body = document.getElementById('payrollHistoryBody');
    const summaryEl = document.getElementById('payrollDateSummary');
    if (!body) return;

    let filtered = payrollRecords.filter((r) => isDateInRange(r.paidDate, payrollDateFrom, payrollDateTo));
    if (payrollMonthFilter) {
      filtered = filtered.filter((r) => r.payMonth === payrollMonthFilter);
    }

    if (summaryEl) {
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
      if (showError) showError(new Error('Please select an employee.'));
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
      if (showSuccess) showSuccess(`Salary paid: ${res.data.employeeName} — ${formatMoney(res.data.netPay)} for ${formatPayMonthLabel(res.data.payMonth)}`);
      document.getElementById('payrollBonus').value = '0';
      document.getElementById('payrollDeductions').value = '0';
      document.getElementById('payrollNote').value = '';
      if (payrollEmployeeSearch) payrollEmployeeSearch.clear();
      document.getElementById('payrollBaseSalary').value = '0';
      recalcNetPay();
      loadPayrollHistory();
    } catch (err) {
      if (showError) showError(err);
    }
  });

  if (bulkForm) {
    bulkForm.addEventListener('submit', async (e) => {
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
        if (showSuccess) {
          showSuccess(
            `Bulk payroll: ${created.length} paid (${formatMoney(total)})` +
              (skipped.length ? `, ${skipped.length} skipped.` : '.')
          );
        }
        loadPayrollHistory();
      } catch (err) {
        if (showError) showError(err);
      }
    });
  }

  if (typeof bindDateRangeFilter === 'function') {
    bindDateRangeFilter('payrollDateFrom', 'payrollDateTo', 'payrollDateClear', (from, to) => {
      payrollDateFrom = from;
      payrollDateTo = to;
      renderPayrollHistory();
    });
  }

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
        const baseSalaryEl = document.getElementById('payrollBaseSalary');
        if (baseSalaryEl) baseSalaryEl.value = item.salary || 0;
        fetchAndCalcAbsentDeduction(item.id);
        recalcNetPay();
      }
    }
  };
}
