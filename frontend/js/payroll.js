/**
 * Department-Based HR & Payroll Module JavaScript
 */

document.addEventListener('DOMContentLoaded', async () => {
  const deptModalEl = document.getElementById('deptModal');
  if (!deptModalEl) return;

  requireAuthOrRedirect();
  renderSidebar('/payroll.html');
  renderTopbar();
  if (document.getElementById('pageTitle')) {
    document.getElementById('pageTitle').textContent = 'HR & Payroll Module';
  }

  const alertBox = document.getElementById('payrollAlert');
  const successBox = document.getElementById('payrollSuccess');

  let employees = [];
  let departments = [];
  let payrollRecords = [];
  let attendanceRecords = [];
  let advanceRecords = [];
  let leaveRecords = [];

  let processEmployeeSearch;
  let attEmployeeSearch;
  let advEmployeeSearch;
  let leaveEmployeeSearch;

  let editingPayrollId = null;
  let editingDeptId = null;

  const deptModal = new bootstrap.Modal(deptModalEl);

  function showError(err) {
    successBox.classList.add('d-none');
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showSuccess(msg) {
    alertBox.classList.add('d-none');
    successBox.textContent = msg;
    successBox.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearAlerts() {
    alertBox.classList.add('d-none');
    successBox.classList.add('d-none');
  }

  function formatMoney(n) {
    return '৳' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatMonth(payMonth) {
    if (!payMonth || !/^\d{4}-\d{2}$/.test(payMonth)) return payMonth || '';
    const [year, month] = payMonth.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }

  function currentPayMonth() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  const devicesApi = typeof initBiometricDevices === 'function' ? initBiometricDevices({ showError, showSuccess }) : null;
  const shiftsApi = typeof initShiftManagement === 'function' ? initShiftManagement({ showError, showSuccess }) : null;

  // ---- Navigation Tabs ----
  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.remove('d-none');

      if (btn.dataset.tab === 'devicesTab' && devicesApi) {
        devicesApi.loadDevices();
      }
      if (btn.dataset.tab === 'shiftsTab' && shiftsApi) {
        shiftsApi.loadShifts();
      }
    });
  });

  // ---- Load KPI Stats ----
  async function loadDashboardStats() {
    try {
      const res = await apiRequest('/payroll/dashboard-stats');
      const d = res.data;
      const el = (id) => document.getElementById(id);
      if (el('statTotalEmployees')) el('statTotalEmployees').textContent = d.totalEmployees || 0;
      if (el('statPresentToday')) el('statPresentToday').textContent = d.employeesPresentToday || 0;
      if (el('statAbsentToday')) el('statAbsentToday').textContent = d.employeesAbsentToday || 0;
      if (el('statLateToday')) el('statLateToday').textContent = d.employeesLateToday || 0;
      if (el('statOTHoursToday')) el('statOTHoursToday').textContent = `${d.totalOvertimeHoursToday || 0} hrs`;
      if (el('statDevicesStatus')) el('statDevicesStatus').textContent = `${d.devicesOnline || 0} Online / ${d.devicesOffline || 0} Offline`;
      if (el('statLastSyncTime')) el('statLastSyncTime').textContent = d.lastSyncTime ? new Date(d.lastSyncTime).toLocaleTimeString() : 'Never';
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    }
  }

  // ---- Lookups (Employees & Departments) ----
  async function loadLookups() {
    const [empRes, deptRes] = await Promise.all([
      apiRequest('/employees?status=Active'),
      apiRequest('/departments')
    ]);
    employees = empRes.data;
    departments = deptRes.data;

    populateDeptDropdowns();
    populateEmployeeFilterDropdowns();
    initEmployeeSearches();
  }

  function populateDeptDropdowns() {
    const opts = `<option value="">All Departments</option>` +
      departments.map((d) => `<option value="${d.id}">${escapeSlipHtml(d.name)}</option>`).join('');

    const filter1 = document.getElementById('historyDeptFilter');
    const filter2 = document.getElementById('repDept');
    if (filter1) filter1.innerHTML = opts;
    if (filter2) filter2.innerHTML = opts;
  }

  function populateEmployeeFilterDropdowns() {
    const filterEl = document.getElementById('attFilterEmployee');
    if (filterEl) {
      filterEl.innerHTML = '<option value="">All Employees</option>' +
        employees.map((e) => `<option value="${e.id}">${escapeSlipHtml(e.name)}</option>`).join('');
    }
  }

  function initEmployeeSearches() {
    // Process Salary Employee Search
    const mount1 = document.getElementById('payrollEmployeeSearchMount');
    if (mount1 && !processEmployeeSearch) {
      processEmployeeSearch = mountSearchSelect(mount1, {
        items: employees,
        placeholder: 'Search employee...',
        required: true,
        getLabel: (e) => e.name,
        getValue: (e) => e.id,
        getSubLabel: (e) => [e.departmentName || 'General', e.designation].filter(Boolean).join(' · '),
        onSelect: async (e) => {
          document.getElementById('basicSalary').value = e.salary || 0;
          try {
            // Auto fetch advance installment
            const advRes = await apiRequest(`/advances/deduction/${e.id}`);
            document.getElementById('advanceDeduction').value = advRes.data.amount || 0;
          } catch (err) {
            document.getElementById('advanceDeduction').value = 0;
          }
          await fetchAndCalcAttendanceData(e.id);
          recalcNetPay();
        }
      });
    }

    // Attendance Employee Search
    const mount2 = document.getElementById('attEmployeeSearchMount');
    if (mount2 && !attEmployeeSearch) {
      attEmployeeSearch = mountSearchSelect(mount2, {
        items: employees,
        placeholder: 'Search employee...',
        required: true,
        getLabel: (e) => e.name,
        getValue: (e) => e.id,
        getSubLabel: (e) => e.designation
      });
    }

    // Advance Employee Search
    const mount3 = document.getElementById('advEmployeeSearchMount');
    if (mount3 && !advEmployeeSearch) {
      advEmployeeSearch = mountSearchSelect(mount3, {
        items: employees,
        placeholder: 'Search employee...',
        required: true,
        getLabel: (e) => e.name,
        getValue: (e) => e.id,
        getSubLabel: (e) => e.designation
      });
    }

    // Leave Employee Search
    const mount4 = document.getElementById('leaveEmployeeSearchMount');
    if (mount4 && !leaveEmployeeSearch) {
      leaveEmployeeSearch = mountSearchSelect(mount4, {
        items: employees,
        placeholder: 'Search employee...',
        required: true,
        getLabel: (e) => e.name,
        getValue: (e) => e.id,
        getSubLabel: (e) => e.designation
      });
    }
  }

  // ---- Overtime Calculation Helper ----
  function calcOvertimePay() {
    const basic = parseFloat(document.getElementById('basicSalary')?.value) || 0;
    const workingDays = parseFloat(document.getElementById('otWorkingDays')?.value) || 30;
    const dailyHours = parseFloat(document.getElementById('otDailyHours')?.value) || 8;
    const otHrs = parseFloat(document.getElementById('overtimeHoursInput')?.value) || 0;

    // Formula:
    // Hourly Rate = Basic Salary ÷ (Working Days × Daily Working Hours)
    // Overtime Pay = Hourly Rate × OT Hrs
    const totalWorkingHours = workingDays * dailyHours;
    const hourlyRate = (basic > 0 && totalWorkingHours > 0) ? (basic / totalWorkingHours) : 0;
    const overtimePay = Math.max(0, Math.round(hourlyRate * otHrs * 100) / 100);

    const overtimeEl = document.getElementById('overtime');
    if (overtimeEl) {
      overtimeEl.value = overtimePay;
    }

    const helpEl = document.getElementById('otFormulaHelp');
    if (helpEl) {
      helpEl.innerHTML = `Hourly Rate = Basic Salary ÷ (${workingDays} days × ${dailyHours} hrs)<br>Overtime Pay = ${formatMoney(hourlyRate)}/hr × ${otHrs} OT Hrs`;
    }

    recalcNetPay();
  }

  let currentAbsentCount = 0;

  function calcAbsentDeduction() {
    const basic = parseFloat(document.getElementById('basicSalary')?.value) || 0;
    const workingDays = parseFloat(document.getElementById('otWorkingDays')?.value) || 30;
    const effectiveDays = workingDays > 0 ? workingDays : 30;
    const perDaySalary = basic > 0 ? (basic / effectiveDays) : 0;
    const absentDeduction = Math.max(0, Math.round(perDaySalary * currentAbsentCount * 100) / 100);

    const absentEl = document.getElementById('absentDeduction');
    if (absentEl) {
      absentEl.value = absentDeduction;
    }

    const infoEl = document.getElementById('absentDeductionInfo');
    if (infoEl) {
      if (currentAbsentCount > 0) {
        infoEl.textContent = `Auto-synced: ${currentAbsentCount} Absent day(s) (Formula: ৳${basic.toFixed(2)} ÷ ${effectiveDays} days = ৳${perDaySalary.toFixed(2)}/day × ${currentAbsentCount} = ৳${absentDeduction.toFixed(2)})`;
      } else {
        infoEl.textContent = `Auto-synced: 0 Absent days found in Attendance`;
      }
    }
  }

  async function fetchAndCalcAttendanceData(employeeId) {
    if (!employeeId) return;
    const payMonth = document.getElementById('payrollPayMonth')?.value;
    try {
      const attRes = await apiRequest('/attendance');
      const records = attRes.data || [];
      const empAtt = records.filter(a => a.employeeId === employeeId && (!payMonth || (a.date && a.date.startsWith(payMonth))));
      
      // 1. Calculate OT Hours
      const totalOtHrs = empAtt.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);
      const otInput = document.getElementById('overtimeHoursInput');
      if (otInput) {
        otInput.value = totalOtHrs;
      }
      const infoEl = document.getElementById('otHoursInfo');
      if (infoEl) {
        infoEl.textContent = `Auto-synced: ${totalOtHrs} OT Hrs from Attendance (${payMonth || 'all logs'})`;
      }
      calcOvertimePay();

      // 2. Calculate Absent Days & Deduction
      const absentLogs = empAtt.filter(a => a.status === 'Absent' || a.attendanceStatus === 'Absent');
      currentAbsentCount = absentLogs.length;
      calcAbsentDeduction();
    } catch (err) {
      console.warn('Failed to fetch attendance data for calculation', err);
    }
  }

  // ---- Formula Realtime Calculation ----
  function recalcNetPay() {
    const getVal = (id) => parseFloat(document.getElementById(id)?.value) || 0;

    const basic = getVal('basicSalary');
    const houseRent = getVal('houseRent');
    const medical = getVal('medical');
    const transport = getVal('transport');
    const food = getVal('food');
    const overtime = getVal('overtime');
    const festivalBonus = getVal('festivalBonus');
    const performanceBonus = getVal('performanceBonus');
    const commission = getVal('commission');
    const otherAllowance = getVal('otherAllowance');

    const totalEarnings = Math.round((basic + houseRent + medical + transport + food + overtime + festivalBonus + performanceBonus + commission + otherAllowance) * 100) / 100;

    const absent = getVal('absentDeduction');
    const late = getVal('lateDeduction');
    const advance = getVal('advanceDeduction');
    const loan = getVal('loanDeduction');
    const taxRate = getVal('taxDeduction');
    const taxDeductionAmount = Math.round(((basic * taxRate) / 100) * 100) / 100;

    const taxInfoEl = document.getElementById('taxDeductionInfo');
    if (taxInfoEl) {
      taxInfoEl.textContent = `Tax Amount: ${formatMoney(taxDeductionAmount)}`;
    }

    const insurance = getVal('insuranceDeduction');
    const otherD = getVal('otherDeductions');

    const totalDeductions = Math.round((absent + late + advance + loan + taxDeductionAmount + insurance + otherD) * 100) / 100;

    const netSalary = Math.max(0, Math.round((totalEarnings - totalDeductions) * 100) / 100);

    document.getElementById('calcEarningsLabel').textContent = formatMoney(totalEarnings);
    document.getElementById('calcDeductionsLabel').textContent = formatMoney(totalDeductions);
    document.getElementById('payrollNetPayLabel').textContent = formatMoney(netSalary);
  }

  document.querySelectorAll('.calc-earning, .calc-deduct, #basicSalary').forEach((el) => {
    el.addEventListener('input', recalcNetPay);
  });

  ['overtimeHoursInput', 'basicSalary', 'otWorkingDays', 'otDailyHours'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      calcOvertimePay();
      calcAbsentDeduction();
    });
  });
  document.getElementById('payrollPayMonth')?.addEventListener('change', () => {
    const employeeId = processEmployeeSearch?.getValue();
    if (employeeId) {
      fetchAndCalcAttendanceData(employeeId);
    }
  });

  const payMonthEl = document.getElementById('payrollPayMonth');
  const bulkMonthEl = document.getElementById('payrollBulkMonth');
  if (payMonthEl) payMonthEl.value = currentPayMonth();
  if (bulkMonthEl) bulkMonthEl.value = currentPayMonth();
  recalcNetPay();

  // ---- Process Salary Form Submit ----
  document.getElementById('payrollForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const employeeId = processEmployeeSearch?.getValue();
    if (!employeeId) {
      showError(new Error('Please select an employee.'));
      return;
    }

    const payload = {
      employeeId,
      payMonth: document.getElementById('payrollPayMonth').value,
      basicSalary: parseFloat(document.getElementById('basicSalary').value) || 0,
      houseRent: parseFloat(document.getElementById('houseRent').value) || 0,
      medical: parseFloat(document.getElementById('medical').value) || 0,
      transport: parseFloat(document.getElementById('transport').value) || 0,
      food: parseFloat(document.getElementById('food').value) || 0,
      overtime: parseFloat(document.getElementById('overtime').value) || 0,
      festivalBonus: parseFloat(document.getElementById('festivalBonus').value) || 0,
      performanceBonus: parseFloat(document.getElementById('performanceBonus').value) || 0,
      commission: parseFloat(document.getElementById('commission').value) || 0,
      otherAllowance: parseFloat(document.getElementById('otherAllowance').value) || 0,
      absentDeduction: parseFloat(document.getElementById('absentDeduction').value) || 0,
      lateDeduction: parseFloat(document.getElementById('lateDeduction').value) || 0,
      advanceDeduction: parseFloat(document.getElementById('advanceDeduction').value) || 0,
      loanDeduction: parseFloat(document.getElementById('loanDeduction').value) || 0,
      taxDeduction: Math.round((((parseFloat(document.getElementById('basicSalary').value) || 0) * (parseFloat(document.getElementById('taxDeduction').value) || 0)) / 100) * 100) / 100,
      insuranceDeduction: parseFloat(document.getElementById('insuranceDeduction').value) || 0,
      otherDeductions: parseFloat(document.getElementById('otherDeductions').value) || 0,
      paymentMethod: document.getElementById('payrollPaymentMethod').value,
      note: document.getElementById('payrollNote').value.trim()
    };

    try {
      let res;
      if (editingPayrollId) {
        res = await apiRequest(`/payroll/${editingPayrollId}`, { method: 'PUT', body: payload });
        showSuccess('Payroll record updated successfully.');
      } else {
        res = await apiRequest('/payroll', { method: 'POST', body: payload });
        showSuccess(`Salary processed for ${res.data.employeeName} (${formatMonth(res.data.payMonth)})`);
      }

      resetProcessForm();
      await loadPayrollHistory();
      await loadDashboardStats();

      // Launch Salary Slip Modal
      const company = await getCompanySettings();
      const emp = employees.find((x) => x.id === res.data.employeeId) || { id: res.data.employeeId };
      showSalarySlipModal(res.data, emp, company);
    } catch (err) {
      showError(err);
    }
  });

  function resetProcessForm() {
    editingPayrollId = null;
    document.getElementById('processFormTitle').textContent = 'Process Employee Salary';
    document.getElementById('processSubmitBtn').textContent = 'Process & Pay Salary';
    document.getElementById('processCancelEditBtn').classList.add('d-none');

    document.getElementById('payrollForm').reset();
    if (payMonthEl) payMonthEl.value = currentPayMonth();
    processEmployeeSearch?.clear();
    recalcNetPay();
  }

  document.getElementById('processCancelEditBtn').addEventListener('click', resetProcessForm);

  // ---- Bulk Payroll Form Submit ----
  document.getElementById('payrollBulkForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    const payMonth = document.getElementById('payrollBulkMonth').value;
    if (!confirm(`Process bulk salary for all active employees for ${formatMonth(payMonth)}?`)) return;

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
      const total = created.reduce((sum, r) => sum + Number(r.netSalary || r.netPay || 0), 0);
      showSuccess(`Bulk payroll: ${created.length} paid (${formatMoney(total)})` + (skipped.length ? `, ${skipped.length} skipped.` : '.'));

      loadPayrollHistory();
      loadDashboardStats();
    } catch (err) {
      showError(err);
    }
  });

  // ---- Payroll History Table ----
  async function loadPayrollHistory() {
    const deptId = document.getElementById('historyDeptFilter')?.value;
    const payMonth = document.getElementById('historyMonthFilter')?.value;

    const params = new URLSearchParams();
    if (deptId) params.append('departmentId', deptId);
    if (payMonth) params.append('payMonth', payMonth);

    try {
      const res = await apiRequest(`/payroll${params.toString() ? `?${params.toString()}` : ''}`);
      payrollRecords = res.data;
      renderPayrollHistory();
    } catch (err) {
      showError(err);
    }
  }

  function renderPayrollHistory() {
    const body = document.getElementById('payrollHistoryBody');
    if (!payrollRecords.length) {
      body.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No payroll records found.</td></tr>';
      return;
    }

    body.innerHTML = payrollRecords
      .map((r) => {
        const earnings = Number(r.totalEarnings || (Number(r.baseSalary || 0) + Number(r.bonus || 0)));
        const deductions = Number(r.totalDeductions || r.deductions || 0);
        const net = Number(r.netSalary || r.netPay || 0);

        return `
      <tr>
        <td><code>${r.id}</code></td>
        <td>${formatMonth(r.payMonth)}</td>
        <td>${r.employeeName}</td>
        <td><span class="badge bg-light text-dark border">${r.departmentName || 'General'}</span></td>
        <td class="text-success">${formatMoney(earnings)}</td>
        <td class="text-danger">${formatMoney(deductions)}</td>
        <td class="fw-bold text-primary">${formatMoney(net)}</td>
        <td>${r.paymentMethod || 'Cash'}</td>
        <td class="text-end">
          <div class="d-flex justify-content-end gap-1 flex-wrap">
            <button class="btn btn-sm btn-outline-primary" data-view-slip="${r.id}" title="View & Print Slip">👁️ Slip</button>
            <button class="btn btn-sm btn-outline-success" data-pdf-slip="${r.id}" title="Download PDF">📥 PDF</button>
            <button class="btn btn-sm btn-outline-info" data-wa-slip="${r.id}" title="Send via WhatsApp">💬 WA</button>
            <button class="btn btn-sm btn-outline-secondary" data-edit-payroll="${r.id}" title="Edit Record">✏️</button>
            <button class="btn btn-sm btn-outline-danger" data-delete-payroll="${r.id}" title="Delete Record">🗑️</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');

    body.querySelectorAll('[data-view-slip]').forEach((btn) => {
      btn.addEventListener('click', () => openSlipModal(btn.dataset.viewSlip));
    });
    body.querySelectorAll('[data-pdf-slip]').forEach((btn) => {
      btn.addEventListener('click', () => downloadSlipDirect(btn.dataset.pdfSlip));
    });
    body.querySelectorAll('[data-wa-slip]').forEach((btn) => {
      btn.addEventListener('click', () => sendWaDirect(btn.dataset.waSlip));
    });
    body.querySelectorAll('[data-edit-payroll]').forEach((btn) => {
      btn.addEventListener('click', () => openEditPayroll(btn.dataset.editPayroll));
    });
    body.querySelectorAll('[data-delete-payroll]').forEach((btn) => {
      btn.addEventListener('click', () => deletePayrollRecord(btn.dataset.deletePayroll));
    });
  }

  async function openSlipModal(id) {
    const record = payrollRecords.find((x) => x.id === id);
    if (!record) return;
    try {
      const company = await getCompanySettings();
      const emp = employees.find((x) => x.id === record.employeeId) || { id: record.employeeId };
      showSalarySlipModal(record, emp, company);
    } catch (err) {
      showError(err);
    }
  }

  async function downloadSlipDirect(id) {
    const record = payrollRecords.find((x) => x.id === id);
    if (!record) return;
    try {
      const company = await getCompanySettings();
      const emp = employees.find((x) => x.id === record.employeeId) || { id: record.employeeId };
      downloadSalarySlipPdf(record, emp, company);
    } catch (err) {
      showError(err);
    }
  }

  async function sendWaDirect(id) {
    const record = payrollRecords.find((x) => x.id === id);
    if (!record) return;
    try {
      const company = await getCompanySettings();
      const emp = employees.find((x) => x.id === record.employeeId) || { id: record.employeeId };
      sendSalarySlipWhatsApp(record, emp, company);
    } catch (err) {
      showError(err);
    }
  }

  function openEditPayroll(id) {
    const r = payrollRecords.find((x) => x.id === id);
    if (!r) return;
    editingPayrollId = id;

    // Switch to Process Salary Tab
    document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
    document.querySelector('.nav-link[data-tab="processTab"]')?.classList.add('active');
    document.getElementById('processTab')?.classList.remove('d-none');

    document.getElementById('processFormTitle').textContent = `Edit Payroll (${r.id})`;
    document.getElementById('processSubmitBtn').textContent = 'Update Salary Record';
    document.getElementById('processCancelEditBtn').classList.remove('d-none');

    processEmployeeSearch?.setValue(r.employeeId);
    document.getElementById('payrollPayMonth').value = r.payMonth;
    const basicVal = r.basicSalary || r.baseSalary || 0;
    document.getElementById('basicSalary').value = basicVal;
    document.getElementById('houseRent').value = r.houseRent || 0;
    document.getElementById('medical').value = r.medical || 0;
    document.getElementById('transport').value = r.transport || 0;
    document.getElementById('food').value = r.food || 0;

    const otHrsVal = r.overtimeHours !== undefined ? r.overtimeHours : (basicVal > 0 && r.overtime ? Math.round((r.overtime / (basicVal / 8)) * 10) / 10 : 0);
    const otHrsInput = document.getElementById('overtimeHoursInput');
    if (otHrsInput) otHrsInput.value = otHrsVal;

    document.getElementById('overtime').value = r.overtime || 0;
    document.getElementById('festivalBonus').value = r.festivalBonus || r.bonus || 0;
    document.getElementById('performanceBonus').value = r.performanceBonus || 0;
    document.getElementById('commission').value = r.commission || 0;
    document.getElementById('otherAllowance').value = r.otherAllowance || 0;

    document.getElementById('absentDeduction').value = r.absentDeduction || 0;
    document.getElementById('lateDeduction').value = r.lateDeduction || 0;
    document.getElementById('advanceDeduction').value = r.advanceDeduction || 0;
    document.getElementById('loanDeduction').value = r.loanDeduction || 0;
    const taxVal = r.taxDeduction || 0;
    const taxPct = basicVal > 0 && taxVal ? Math.round(((taxVal / basicVal) * 100) * 100) / 100 : taxVal;
    document.getElementById('taxDeduction').value = taxPct;
    document.getElementById('insuranceDeduction').value = r.insuranceDeduction || 0;
    document.getElementById('otherDeductions').value = r.otherDeductions || r.deductions || 0;

    document.getElementById('payrollPaymentMethod').value = r.paymentMethod || 'Cash';
    document.getElementById('payrollNote').value = r.note || '';

    recalcNetPay();
  }

  async function deletePayrollRecord(id) {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await apiRequest(`/payroll/${id}`, { method: 'DELETE' });
      showSuccess('Payroll record deleted.');
      loadPayrollHistory();
      loadDashboardStats();
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('historyDeptFilter')?.addEventListener('change', loadPayrollHistory);
  document.getElementById('historyMonthFilter')?.addEventListener('change', loadPayrollHistory);
  document.getElementById('historyFilterClear')?.addEventListener('click', () => {
    document.getElementById('historyDeptFilter').value = '';
    document.getElementById('historyMonthFilter').value = '';
    loadPayrollHistory();
  });

  // ---- Departments Tab ----
  async function loadDepartments() {
    try {
      const res = await apiRequest('/departments');
      departments = res.data;
      renderDepartmentsTable();
    } catch (err) {
      showError(err);
    }
  }

  function renderDepartmentsTable() {
    const body = document.getElementById('deptTableBody');
    if (!departments.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No departments found.</td></tr>';
      return;
    }

    body.innerHTML = departments
      .map((d) => `
      <tr>
        <td><code>${d.code}</code></td>
        <td class="fw-bold">${d.name}</td>
        <td>${d.managerId || '—'}</td>
        <td><span class="badge bg-primary rounded-pill">${d.employeeCount || 0} Employees</span></td>
        <td><span class="badge bg-success">${d.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-edit-dept="${d.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-delete-dept="${d.id}">Deactivate</button>
        </td>
      </tr>`)
      .join('');

    body.querySelectorAll('[data-edit-dept]').forEach((btn) => {
      btn.addEventListener('click', () => openEditDept(btn.dataset.editDept));
    });
    body.querySelectorAll('[data-delete-dept]').forEach((btn) => {
      btn.addEventListener('click', () => deleteDept(btn.dataset.deleteDept));
    });
  }

  let isDeptCodeUserEdited = false;

  function generateDepartmentCode(name) {
    if (!name || typeof name !== 'string') return '';
    const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);

    if (words.length === 0) return '';

    if (words.length === 1) {
      const word = words[0];
      if (word.length <= 4) return word;
      return word.slice(0, 3);
    }

    const code = words.map((w) => w[0]).join('');
    if (code.length < 2 && words[0].length >= 3) {
      return words[0].slice(0, 3);
    }
    return code.slice(0, 5);
  }

  document.getElementById('d_name')?.addEventListener('input', (e) => {
    const codeEl = document.getElementById('d_code');
    if (codeEl && (!isDeptCodeUserEdited || !codeEl.value.trim())) {
      isDeptCodeUserEdited = false;
      codeEl.value = generateDepartmentCode(e.target.value);
    }
  });

  document.getElementById('d_code')?.addEventListener('input', (e) => {
    if (e.target.value.trim()) {
      isDeptCodeUserEdited = true;
    } else {
      isDeptCodeUserEdited = false;
    }
  });

  document.getElementById('addDeptBtn')?.addEventListener('click', () => {
    editingDeptId = null;
    isDeptCodeUserEdited = false;
    document.getElementById('deptForm').reset();
    document.getElementById('deptModalTitle').textContent = 'Add Department';
    deptModal.show();
  });

  function openEditDept(id) {
    const d = departments.find((x) => x.id === id);
    if (!d) return;
    editingDeptId = id;
    isDeptCodeUserEdited = true;
    document.getElementById('deptModalTitle').textContent = `Edit ${d.name}`;
    document.getElementById('d_name').value = d.name;
    document.getElementById('d_code').value = d.code;
    document.getElementById('d_description').value = d.description || '';
    deptModal.show();
  }

  async function deleteDept(id) {
    if (!confirm('Deactivate this department?')) return;
    try {
      await apiRequest(`/departments/${id}`, { method: 'DELETE' });
      loadDepartments();
      loadLookups();
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('deptForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    const payload = {
      name: document.getElementById('d_name').value.trim(),
      code: document.getElementById('d_code').value.trim(),
      description: document.getElementById('d_description').value.trim()
    };
    try {
      if (editingDeptId) {
        await apiRequest(`/departments/${editingDeptId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/departments', { method: 'POST', body: payload });
      }
      deptModal.hide();
      loadDepartments();
      loadLookups();
    } catch (err) {
      showError(err);
    }
  });

  // ---- Attendance Tab ----
  document.getElementById('attDate').value = todayISO();

  async function loadAttendance() {
    const empId = document.getElementById('attFilterEmployee')?.value;
    const month = document.getElementById('attFilterMonth')?.value;
    const date = document.getElementById('attFilterDate')?.value;
    const status = document.getElementById('attFilterStatus')?.value;

    const params = new URLSearchParams();
    if (empId) params.append('employeeId', empId);
    if (date) params.append('date', date);
    if (status) params.append('status', status);

    try {
      const res = await apiRequest(`/attendance${params.toString() ? `?${params.toString()}` : ''}`);
      let data = res.data || [];
      if (month) {
        data = data.filter((r) => r.date && r.date.startsWith(month));
      }
      attendanceRecords = data;
      renderAttendanceTable();
    } catch (err) {
      showError(err);
    }
  }

  function renderAttendanceTable() {
    const body = document.getElementById('attTableBody');

    const totalOT = attendanceRecords.reduce((sum, r) => sum + (Number(r.overtimeHours) || 0), 0);
    const totalWork = attendanceRecords.reduce((sum, r) => sum + (Number(r.workingHours) || 0), 0);
    const presentCount = attendanceRecords.filter((r) => r.status === 'Present').length;
    const absentCount = attendanceRecords.filter((r) => r.status === 'Absent').length;
    const lateCount = attendanceRecords.filter((r) => r.status === 'Late').length;

    const otEl = document.getElementById('attSummaryOT');
    const workEl = document.getElementById('attSummaryWork');
    const presEl = document.getElementById('attSummaryPresent');
    const absEl = document.getElementById('attSummaryAbsent');
    const lateEl = document.getElementById('attSummaryLate');

    if (otEl) otEl.textContent = `${totalOT} hrs`;
    if (workEl) workEl.textContent = `${totalWork} hrs`;
    if (presEl) presEl.textContent = `Present: ${presentCount}`;
    if (absEl) absEl.textContent = `Absent: ${absentCount}`;
    if (lateEl) lateEl.textContent = `Late: ${lateCount}`;

    if (!attendanceRecords.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No attendance records found.</td></tr>';
      return;
    }

    body.innerHTML = attendanceRecords
      .map((r) => {
        let badgeClass = 'bg-secondary';
        if (r.status === 'Present') badgeClass = 'bg-success';
        if (r.status === 'Absent') badgeClass = 'bg-danger';
        if (r.status === 'Late') badgeClass = 'bg-warning text-dark';
        if (r.status === 'Half-day') badgeClass = 'bg-info text-dark';

        return `
      <tr>
        <td>${r.date}</td>
        <td>${r.employeeName}</td>
        <td><span class="badge ${badgeClass}">${r.status}</span></td>
        <td>${r.checkIn || '—'} / ${r.checkOut || '—'}</td>
        <td>${r.workingHours || 0} hrs</td>
        <td class="fw-bold text-dark">${r.overtimeHours || 0} hrs</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-delete-att="${r.id}">Delete</button>
        </td>
      </tr>`;
      })
      .join('');

    body.querySelectorAll('[data-delete-att]').forEach((btn) => {
      btn.addEventListener('click', () => deleteAttendance(btn.dataset.deleteAtt));
    });
  }

  ['attFilterEmployee', 'attFilterMonth', 'attFilterDate', 'attFilterStatus'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', loadAttendance);
  });

  document.getElementById('attFilterClear')?.addEventListener('click', () => {
    ['attFilterEmployee', 'attFilterMonth', 'attFilterDate', 'attFilterStatus'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    loadAttendance();
  });

  function calculateAttendanceOvertime() {
    const checkIn = document.getElementById('attCheckIn')?.value;
    const checkOut = document.getElementById('attCheckOut')?.value;
    const workingHours = parseFloat(document.getElementById('attWorkingHours')?.value) || 0;
    const otInput = document.getElementById('attOvertimeHours');

    if (!otInput) return;

    if (!checkIn || !checkOut) {
      otInput.value = 0;
      return;
    }

    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);

    let inMins = inH * 60 + inM;
    let outMins = outH * 60 + outM;

    if (outMins < inMins) {
      outMins += 24 * 60; // Overnight shift
    }

    const totalHours = (outMins - inMins) / 60;
    const overtime = Math.max(0, totalHours - workingHours);
    otInput.value = Math.round(overtime * 10) / 10;
  }

  ['attCheckIn', 'attCheckOut', 'attWorkingHours'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateAttendanceOvertime);
      el.addEventListener('change', calculateAttendanceOvertime);
    }
  });

  document.getElementById('attForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    const employeeId = attEmployeeSearch?.getValue();
    if (!employeeId) {
      showError(new Error('Please select an employee.'));
      return;
    }

    const payload = {
      employeeId,
      date: document.getElementById('attDate').value,
      status: document.getElementById('attStatus').value,
      checkIn: document.getElementById('attCheckIn').value,
      checkOut: document.getElementById('attCheckOut').value,
      workingHours: parseFloat(document.getElementById('attWorkingHours').value) || 0,
      overtimeHours: parseFloat(document.getElementById('attOvertimeHours').value) || 0
    };

    try {
      await apiRequest('/attendance', { method: 'POST', body: payload });
      showSuccess('Attendance recorded.');
      loadAttendance();
      loadDashboardStats();
    } catch (err) {
      showError(err);
    }
  });

  async function deleteAttendance(id) {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await apiRequest(`/attendance/${id}`, { method: 'DELETE' });
      loadAttendance();
      loadDashboardStats();
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('attFilterDate')?.addEventListener('change', loadAttendance);
  document.getElementById('attFilterStatus')?.addEventListener('change', loadAttendance);

  // ---- Salary Advances Tab ----
  document.getElementById('advDate').value = todayISO();

  async function loadAdvances() {
    try {
      const res = await apiRequest('/advances');
      advanceRecords = res.data;
      renderAdvancesTable();
    } catch (err) {
      showError(err);
    }
  }

  function renderAdvancesTable() {
    const body = document.getElementById('advTableBody');
    if (!advanceRecords.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No salary advances recorded.</td></tr>';
      return;
    }

    body.innerHTML = advanceRecords
      .map((a) => `
      <tr>
        <td>${a.advanceDate}</td>
        <td>${a.employeeName}</td>
        <td>${formatMoney(a.amount)}</td>
        <td>${formatMoney(a.installmentAmount)}</td>
        <td class="fw-bold text-danger">${formatMoney(a.remainingBalance)}</td>
        <td><span class="badge ${a.status === 'Active' ? 'bg-warning text-dark' : 'bg-success'}">${a.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-delete-adv="${a.id}">Delete</button>
        </td>
      </tr>`)
      .join('');

    body.querySelectorAll('[data-delete-adv]').forEach((btn) => {
      btn.addEventListener('click', () => deleteAdvance(btn.dataset.deleteAdv));
    });
  }

  document.getElementById('advForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    const employeeId = advEmployeeSearch?.getValue();
    if (!employeeId) {
      showError(new Error('Please select an employee.'));
      return;
    }

    const payload = {
      employeeId,
      amount: parseFloat(document.getElementById('advAmount').value),
      installmentAmount: parseFloat(document.getElementById('advInstallment').value) || undefined,
      advanceDate: document.getElementById('advDate').value,
      reason: document.getElementById('advReason').value.trim()
    };

    try {
      await apiRequest('/advances', { method: 'POST', body: payload });
      showSuccess('Salary advance issued.');
      document.getElementById('advAmount').value = '';
      document.getElementById('advInstallment').value = '';
      document.getElementById('advReason').value = '';
      advEmployeeSearch?.clear();
      loadAdvances();
    } catch (err) {
      showError(err);
    }
  });

  async function deleteAdvance(id) {
    if (!confirm('Delete this salary advance?')) return;
    try {
      await apiRequest(`/advances/${id}`, { method: 'DELETE' });
      loadAdvances();
    } catch (err) {
      showError(err);
    }
  }

  // ---- Leave Management Tab ----
  document.getElementById('leaveStart').value = todayISO();
  document.getElementById('leaveEnd').value = todayISO();

  async function loadLeaves() {
    try {
      const res = await apiRequest('/leaves');
      leaveRecords = res.data;
      renderLeaveTable();
    } catch (err) {
      showError(err);
    }
  }

  function renderLeaveTable() {
    const body = document.getElementById('leaveTableBody');
    if (!leaveRecords.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No leave requests found.</td></tr>';
      return;
    }

    body.innerHTML = leaveRecords
      .map((l) => {
        let badge = 'bg-warning text-dark';
        if (l.status === 'Approved') badge = 'bg-success';
        if (l.status === 'Rejected') badge = 'bg-danger';

        return `
      <tr>
        <td>${l.employeeName}</td>
        <td><span class="badge bg-light text-dark border">${l.leaveType}</span></td>
        <td>${l.startDate} &rarr; ${l.endDate}</td>
        <td><strong>${l.days}</strong> day(s)</td>
        <td>${l.reason || '—'}</td>
        <td><span class="badge ${badge}">${l.status}</span></td>
        <td class="text-end">
          ${
            l.status === 'Pending'
              ? `<button class="btn btn-sm btn-success me-1" data-approve-leave="${l.id}">Approve</button>
                 <button class="btn btn-sm btn-outline-danger me-1" data-reject-leave="${l.id}">Reject</button>`
              : ''
          }
          <button class="btn btn-sm btn-outline-secondary" data-delete-leave="${l.id}">Delete</button>
        </td>
      </tr>`;
      })
      .join('');

    body.querySelectorAll('[data-approve-leave]').forEach((btn) => {
      btn.addEventListener('click', () => updateLeaveStatus(btn.dataset.approveLeave, 'Approved'));
    });
    body.querySelectorAll('[data-reject-leave]').forEach((btn) => {
      btn.addEventListener('click', () => updateLeaveStatus(btn.dataset.rejectLeave, 'Rejected'));
    });
    body.querySelectorAll('[data-delete-leave]').forEach((btn) => {
      btn.addEventListener('click', () => deleteLeave(btn.dataset.deleteLeave));
    });
  }

  document.getElementById('leaveForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    const employeeId = leaveEmployeeSearch?.getValue();
    if (!employeeId) {
      showError(new Error('Please select an employee.'));
      return;
    }

    const payload = {
      employeeId,
      leaveType: document.getElementById('leaveType').value,
      startDate: document.getElementById('leaveStart').value,
      endDate: document.getElementById('leaveEnd').value,
      reason: document.getElementById('leaveReason').value.trim()
    };

    try {
      await apiRequest('/leaves', { method: 'POST', body: payload });
      showSuccess('Leave request submitted.');
      document.getElementById('leaveReason').value = '';
      leaveEmployeeSearch?.clear();
      loadLeaves();
      loadDashboardStats();
    } catch (err) {
      showError(err);
    }
  });

  async function updateLeaveStatus(id, status) {
    try {
      await apiRequest(`/leaves/${id}/status`, { method: 'PUT', body: { status } });
      loadLeaves();
      loadDashboardStats();
    } catch (err) {
      showError(err);
    }
  }

  async function deleteLeave(id) {
    if (!confirm('Delete this leave request?')) return;
    try {
      await apiRequest(`/leaves/${id}`, { method: 'DELETE' });
      loadLeaves();
      loadDashboardStats();
    } catch (err) {
      showError(err);
    }
  }

  // ---- Reports Tab Generator ----
  document.getElementById('generateRepBtn')?.addEventListener('click', async () => {
    const type = document.getElementById('repType').value;
    const deptId = document.getElementById('repDept').value;
    const payMonth = document.getElementById('repMonth').value;

    const container = document.getElementById('reportContainer');
    const titleEl = document.getElementById('reportTitle');
    const contentEl = document.getElementById('reportContent');

    container.classList.remove('d-none');
    contentEl.innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Generating report...</div>';

    try {
      if (type === 'dept' || type === 'emp' || type === 'monthly') {
        const params = new URLSearchParams();
        if (deptId) params.append('departmentId', deptId);
        if (payMonth) params.append('payMonth', payMonth);
        const res = await apiRequest(`/payroll${params.toString() ? `?${params.toString()}` : ''}`);
        const data = res.data;

        titleEl.textContent = `Payroll Summary Report ${payMonth ? `(${formatMonth(payMonth)})` : ''}`;

        if (!data.length) {
          contentEl.innerHTML = '<div class="alert alert-warning">No payroll records match the criteria.</div>';
          return;
        }

        const totalEarn = data.reduce((sum, r) => sum + Number(r.totalEarnings || r.baseSalary || 0), 0);
        const totalDeduct = data.reduce((sum, r) => sum + Number(r.totalDeductions || r.deductions || 0), 0);
        const totalNet = data.reduce((sum, r) => sum + Number(r.netSalary || r.netPay || 0), 0);

        contentEl.innerHTML = `
          <div class="row g-2 mb-3 fw-bold">
            <div class="col-4">Total Earnings: <span class="text-success">${formatMoney(totalEarn)}</span></div>
            <div class="col-4">Total Deductions: <span class="text-danger">${formatMoney(totalDeduct)}</span></div>
            <div class="col-4">Total Net Paid: <span class="text-primary">${formatMoney(totalNet)}</span></div>
          </div>
          <table class="table table-bordered table-sm align-middle">
            <thead class="table-dark">
              <tr><th>Employee</th><th>Department</th><th>Month</th><th>Base Salary</th><th>Earnings</th><th>Deductions</th><th>Net Pay</th></tr>
            </thead>
            <tbody>
              ${data.map(r => `
                <tr>
                  <td>${r.employeeName}</td>
                  <td>${r.departmentName || 'General'}</td>
                  <td>${formatMonth(r.payMonth)}</td>
                  <td>${formatMoney(r.basicSalary || r.baseSalary)}</td>
                  <td class="text-success">${formatMoney(r.totalEarnings || r.baseSalary)}</td>
                  <td class="text-danger">${formatMoney(r.totalDeductions || r.deductions)}</td>
                  <td class="fw-bold">${formatMoney(r.netSalary || r.netPay)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } else if (type === 'att') {
        const res = await apiRequest('/attendance');
        titleEl.textContent = 'Attendance Overview Report';
        contentEl.innerHTML = `
          <table class="table table-bordered table-sm align-middle">
            <thead class="table-dark">
              <tr><th>Date</th><th>Employee</th><th>Status</th><th>Work Hrs</th><th>OT Hrs</th></tr>
            </thead>
            <tbody>
              ${res.data.map(a => `
                <tr>
                  <td>${a.date}</td>
                  <td>${a.employeeName}</td>
                  <td>${a.status}</td>
                  <td>${a.workingHours}</td>
                  <td>${a.overtimeHours}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } else if (type === 'leave') {
        const res = await apiRequest('/leaves');
        titleEl.textContent = 'Leave Summary Report';
        contentEl.innerHTML = `
          <table class="table table-bordered table-sm align-middle">
            <thead class="table-dark">
              <tr><th>Employee</th><th>Category</th><th>Dates</th><th>Days</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${res.data.map(l => `
                <tr>
                  <td>${l.employeeName}</td>
                  <td>${l.leaveType}</td>
                  <td>${l.startDate} &rarr; ${l.endDate}</td>
                  <td>${l.days}</td>
                  <td>${l.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } else if (type === 'adv') {
        const res = await apiRequest('/advances');
        titleEl.textContent = 'Salary Advance & Loan Report';
        contentEl.innerHTML = `
          <table class="table table-bordered table-sm align-middle">
            <thead class="table-dark">
              <tr><th>Date</th><th>Employee</th><th>Amount</th><th>Installment</th><th>Remaining</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${res.data.map(a => `
                <tr>
                  <td>${a.advanceDate}</td>
                  <td>${a.employeeName}</td>
                  <td>${formatMoney(a.amount)}</td>
                  <td>${formatMoney(a.installmentAmount)}</td>
                  <td class="text-danger fw-bold">${formatMoney(a.remainingBalance)}</td>
                  <td>${a.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      }
    } catch (err) {
      showError(err);
    }
  });

  // ---- Initial Load ----
  try {
    await loadLookups();
    await loadDashboardStats();
    await loadPayrollHistory();
    await loadDepartments();
    await loadAttendance();
    await loadAdvances();
    await loadLeaves();
    if (devicesApi) await devicesApi.loadDevices();
    if (shiftsApi) await shiftsApi.loadShifts();
  } catch (err) {
    showError(err);
  }
});
