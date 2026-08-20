const { diagnosticOrderRepository, diagnosticResultRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class DiagnosticAnalyticsService {
  /**
   * Aggregates Turnaround Time (TAT) metrics, Modality Utilization, and Financial KPIs.
   */
  async getAnalyticsDashboard() {
    const tenantId = getCurrentTenantId();

    const orders = await diagnosticOrderRepository.findAll({});
    const results = await diagnosticResultRepository.findAll({});

    // 1. Financial Diagnostic KPI Calculations
    let netRevenue = 0;
    let dailyCollection = 0;
    let pendingLiabilities = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    orders.forEach((ord) => {
      const fin = ord.financials || {};
      netRevenue += fin.netAmount || 0;
      pendingLiabilities += fin.dueAmount || 0;

      if (ord.createdAt && ord.createdAt.slice(0, 10) === todayStr) {
        dailyCollection += fin.paidAmount || 0;
      }
    });

    // 2. Modality Utilization Breakdown
    const modalityCounts = {
      Pathology: 0,
      MRI: 0,
      CT: 0,
      XRay: 0,
      USG: 0,
      Other: 0
    };

    orders.forEach((ord) => {
      (ord.tests || []).forEach((t) => {
        const dept = (t.department || '').toLowerCase();
        const code = (t.testCode || t.testName || '').toLowerCase();

        if (dept.includes('pathology')) {
          modalityCounts.Pathology++;
        } else if (code.includes('mri')) {
          modalityCounts.MRI++;
        } else if (code.includes('ct')) {
          modalityCounts.CT++;
        } else if (code.includes('xray') || code.includes('x-ray')) {
          modalityCounts.XRay++;
        } else if (code.includes('usg') || code.includes('ultrasound')) {
          modalityCounts.USG++;
        } else {
          modalityCounts.Other++;
        }
      });
    });

    // 3. Turnaround Time (TAT) Metrics (intake to final authorization in minutes)
    let totalTatMinutes = 0;
    let completedCount = 0;

    results.forEach((res) => {
      if (res.authorizedAt && res.createdAt) {
        const start = new Date(res.createdAt).getTime();
        const end = new Date(res.authorizedAt).getTime();
        const diffMinutes = Math.max(0, Math.round((end - start) / (1000 * 60)));
        totalTatMinutes += diffMinutes;
        completedCount++;
      }
    });

    const avgTatMinutes = completedCount > 0 ? Math.round(totalTatMinutes / completedCount) : 45; // Default 45 mins fallback

    return {
      financialKpis: {
        netRevenue,
        dailyCollection,
        pendingLiabilities
      },
      modalityUtilization: modalityCounts,
      tatMetrics: {
        avgTatMinutes,
        avgTatFormatted: `${Math.floor(avgTatMinutes / 60)}h ${avgTatMinutes % 60}m`,
        totalCompletedReports: completedCount
      }
    };
  }
}

module.exports = new DiagnosticAnalyticsService();
