const { doctorCommissionRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');
const logger = require('../utils/logger');

class DoctorCommissionService {
  /**
   * Auto-calculate referring doctor earnings upon invoice creation/completion.
   */
  async calculateAndRecordCommission(orderRecord, defaultRate = 10) {
    const tenantId = getCurrentTenantId();
    const doctorName = orderRecord.referredDoctor?.name;

    if (!doctorName || doctorName.toLowerCase().includes('self') || doctorName.toLowerCase().includes('general')) {
      return null;
    }

    const netAmount = orderRecord.financials?.netAmount || 0;
    if (netAmount <= 0) return null;

    const commissionAmount = Math.round((netAmount * defaultRate) / 100);

    const commissionRecord = await doctorCommissionRepository.create({
      tenantId,
      doctorName,
      orderId: orderRecord.id,
      invoiceNumber: orderRecord.invoiceNumber,
      uhid: orderRecord.uhid,
      totalOrderAmount: netAmount,
      commissionRate: defaultRate,
      commissionAmount,
      payoutStatus: 'Unpaid',
      paidAt: null,
      paymentReference: ''
    });

    logger.info(`Recorded doctor referral commission: ${commissionAmount} BDT for ${doctorName} on invoice ${orderRecord.invoiceNumber}`);
    return commissionRecord;
  }

  async getCommissions({ doctorName, payoutStatus } = {}) {
    const filter = {};
    if (doctorName) filter.doctorName = doctorName;
    if (payoutStatus) filter.payoutStatus = payoutStatus;

    const records = await doctorCommissionRepository.findAll(filter);

    let totalEarned = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    records.forEach((r) => {
      totalEarned += r.commissionAmount || 0;
      if (r.payoutStatus === 'Paid') totalPaid += r.commissionAmount || 0;
      else totalUnpaid += r.commissionAmount || 0;
    });

    return {
      commissions: records,
      summary: {
        totalEarned,
        totalPaid,
        totalUnpaid
      }
    };
  }

  async processPayout(commissionId, { paymentReference = 'CASH-PAYOUT' } = {}) {
    const record = await doctorCommissionRepository.findById(commissionId);
    if (!record) {
      const err = new Error(`Commission record not found: ${commissionId}`);
      err.status = 404;
      throw err;
    }

    const updated = await doctorCommissionRepository.update(commissionId, {
      payoutStatus: 'Paid',
      paidAt: new Date().toISOString(),
      paymentReference
    });

    logger.info(`Processed commission payout of ${record.commissionAmount} BDT to ${record.doctorName}`);
    return updated;
  }
}

module.exports = new DoctorCommissionService();
