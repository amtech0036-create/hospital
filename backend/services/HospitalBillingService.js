const { hospitalBillingRepository, patientRepository } = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class HospitalBillingService {
  async list({ search, paymentStatus, page = 1, limit = 50 } = {}) {
    let items = await hospitalBillingRepository.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => 
        (i.uhid || '').toLowerCase().includes(q) ||
        (i.patientName || '').toLowerCase().includes(q) ||
        (i.invoiceId || '').toLowerCase().includes(q)
      );
    }

    if (paymentStatus) items = items.filter(i => i.paymentStatus === paymentStatus);

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);

    return {
      invoices: items.slice(startIndex, startIndex + Number(limit)),
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async create(data) {
    const tenantId = getCurrentTenantId();
    let patientName = data.patientName;
    if (data.patientId || data.uhid) {
      const patient = (await patientRepository.findById(data.patientId)) || (await patientRepository.findOne({ uhid: data.uhid }));
      if (patient) {
        data.patientId = patient.id;
        data.uhid = patient.uhid;
        patientName = patient.fullName;
      }
    }

    const totalAmount = Number(data.totalAmount) || 0;
    const discount = Number(data.discount) || 0;
    const netAmount = totalAmount - discount;
    const paidAmount = Number(data.paidAmount) || 0;
    const dueAmount = Math.max(0, netAmount - paidAmount);
    let paymentStatus = 'Unpaid';
    if (paidAmount >= netAmount && netAmount > 0) paymentStatus = 'Paid';
    else if (paidAmount > 0) paymentStatus = 'Partial';

    return hospitalBillingRepository.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Patient Bill',
      departmentBreakdown: data.departmentBreakdown || {
        opd: 0,
        ipd: 0,
        pharmacy: 0,
        diagnostics: 0,
        ot: 0,
        emergency: 0
      },
      totalAmount,
      discount,
      netAmount,
      paidAmount,
      dueAmount,
      paymentStatus,
      paymentMethod: data.paymentMethod || 'Cash',
      cashierId: data.cashierId || 'CASHIER-01',
      remarks: data.remarks || ''
    });
  }

  async update(id, data) {
    const existing = await hospitalBillingRepository.findById(id);
    if (!existing) {
      const err = new Error(`Invoice not found: ${id}`);
      err.status = 404;
      throw err;
    }

    const totalAmount = Number(data.totalAmount !== undefined ? data.totalAmount : existing.totalAmount) || 0;
    const discount = Number(data.discount !== undefined ? data.discount : existing.discount) || 0;
    const netAmount = totalAmount - discount;
    const paidAmount = Number(data.paidAmount !== undefined ? data.paidAmount : existing.paidAmount) || 0;
    const dueAmount = Math.max(0, netAmount - paidAmount);
    
    let paymentStatus = 'Unpaid';
    if (paidAmount >= netAmount && netAmount > 0) paymentStatus = 'Paid';
    else if (paidAmount > 0) paymentStatus = 'Partial';

    return hospitalBillingRepository.update(id, {
      ...data,
      netAmount,
      dueAmount,
      paymentStatus
    });
  }
}

module.exports = new HospitalBillingService();
