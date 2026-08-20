document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/diagnostics-analytics.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Modality Analytics & Doctor Referral Commissions';

  loadAnalyticsData();
  loadCommissionsLedger();

  document.getElementById('btnRefreshCommissions')?.addEventListener('click', loadCommissionsLedger);

  async function loadAnalyticsData() {
    try {
      const res = await apiRequest('/diagnostics/analytics');
      const data = res.data || {};

      // Financial KPIs
      const kpis = data.financialKpis || {};
      document.getElementById('kpiNetRevenue').textContent = `${(kpis.netRevenue || 0).toFixed(2)} BDT`;
      document.getElementById('kpiDailyCollection').textContent = `${(kpis.dailyCollection || 0).toFixed(2)} BDT`;
      document.getElementById('kpiPendingDue').textContent = `${(kpis.pendingLiabilities || 0).toFixed(2)} BDT`;

      // TAT Metrics
      const tat = data.tatMetrics || {};
      document.getElementById('kpiAvgTat').textContent = tat.avgTatFormatted || '0h 45m';

      // Modality Utilization
      const vol = data.modalityUtilization || {};
      document.getElementById('volPathology').textContent = vol.Pathology || 0;
      document.getElementById('volMRI').textContent = vol.MRI || 0;
      document.getElementById('volCT').textContent = vol.CT || 0;
      document.getElementById('volXRay').textContent = vol.XRay || 0;
      document.getElementById('volUSG').textContent = vol.USG || 0;
    } catch (err) {
      console.warn('Analytics loading error:', err);
    }
  }

  async function loadCommissionsLedger() {
    const tbody = document.getElementById('commissionsTbody');
    try {
      const res = await apiRequest('/diagnostics/commissions');
      const commissions = res.data?.commissions || [];

      if (commissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No referral commissions recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = commissions.map((item) => `
        <tr>
          <td><strong>${item.doctorName}</strong></td>
          <td><code>${item.invoiceNumber}</code></td>
          <td>${(item.totalOrderAmount || 0).toFixed(2)} BDT</td>
          <td class="fw-bold text-success">${(item.commissionAmount || 0).toFixed(2)} BDT</td>
          <td><span class="badge ${item.payoutStatus === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}">${item.payoutStatus}</span></td>
          <td class="text-end">
            ${item.payoutStatus === 'Unpaid' ? `
              <button type="button" class="btn btn-sm btn-outline-success btn-payout" data-id="${item.id}">
                <i class="bi bi-cash-stack me-1"></i>Pay Out
              </button>
            ` : `<small class="text-muted"><i class="bi bi-check-all text-success"></i> Paid</small>`}
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-payout').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          try {
            const payRes = await apiRequest(`/diagnostics/commissions/${id}/payout`, {
              method: 'POST',
              body: { paymentReference: 'PAYOUT-CASH-' + Date.now() }
            });
            alert(payRes.message || 'Doctor referral commission paid out.');
            loadCommissionsLedger();
          } catch (err) {
            alert(err.message || 'Payout failed.');
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No referral commissions recorded yet.</td></tr>';
    }
  }
});
