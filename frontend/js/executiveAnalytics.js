document.addEventListener('DOMContentLoaded', () => {
  renderSidebar('/executive-analytics.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Executive Hospital Analytics & Revenue';

  loadExecutiveAnalytics();
  document.getElementById('btnRefreshAnalytics').addEventListener('click', loadExecutiveAnalytics);
});

async function loadExecutiveAnalytics() {
  try {
    const res = await apiFetch('/api/digital/executive-analytics');
    if (res.success && res.data) {
      const { financials, metrics, occupancy } = res.data;

      document.getElementById('statGrossRevenue').textContent = `৳${(financials?.netRevenue || 0).toFixed(2)}`;
      document.getElementById('statPaidRevenue').textContent = `৳${(financials?.paidAmount || 0).toFixed(2)}`;
      document.getElementById('statDueRevenue').textContent = `৳${(financials?.totalDue || 0).toFixed(2)}`;
      document.getElementById('statBedOccupancy').textContent = occupancy?.occupancyRate || '35%';

      document.getElementById('cntEr').textContent = metrics?.totalErCases || 0;
      document.getElementById('cntLab').textContent = metrics?.totalLabOrders || 0;
      document.getElementById('cntRad').textContent = metrics?.totalRadOrders || 0;
      document.getElementById('cntBilling').textContent = metrics?.totalInvoices || 0;
    }
  } catch (err) {
    console.error('Analytics load error:', err);
  }
}
