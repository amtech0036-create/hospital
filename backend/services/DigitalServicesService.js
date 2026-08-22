const {
  telemedicineRepo,
  auditLogRepo,
  patientRepository,
  doctorRepository,
  hospitalBillingRepository,
  emergencyRepository,
  pathologyRepository,
  radiologyRepository
} = require('../repositories');
const { getCurrentTenantId } = require('../context/tenantContext');

class DigitalServicesService {
  // --- Telemedicine ---
  async listTelemedicine({ search, status, page = 1, limit = 50 } = {}) {
    let items = await telemedicineRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => (i.uhid || '').toLowerCase().includes(q) || (i.patientName || '').toLowerCase().includes(q) || (i.doctorName || '').toLowerCase().includes(q));
    }
    if (status) items = items.filter(i => i.status === status);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { sessions: items, pagination: { total: items.length, page: Number(page), limit: Number(limit) } };
  }

  async createTelemedicine(data) {
    const tenantId = getCurrentTenantId();
    let patientName = data.patientName;
    if (data.patientId || data.uhid) {
      const patient = (await patientRepository.findById(data.patientId)) || (await patientRepository.findOne({ uhid: data.uhid }));
      if (patient) { data.patientId = patient.id; data.uhid = patient.uhid; patientName = patient.fullName; }
    }
    const count = await telemedicineRepo.count({});
    const videoRoomUrl = `https://meet.jit.si/HospitalERP-TeleMed-${String(count + 1).padStart(5, '0')}`;

    return telemedicineRepo.create({
      tenantId,
      patientId: data.patientId || null,
      uhid: data.uhid || '',
      patientName: patientName || 'Online Patient',
      doctorName: data.doctorName || 'Dr. Teleconsultant',
      appointmentDate: data.appointmentDate || new Date().toISOString(),
      videoRoomUrl,
      prescriptionUrl: '',
      paymentStatus: 'Paid (Online)',
      status: 'Scheduled'
    });
  }

  // --- Executive Dashboard & Analytics Aggregator ---
  async getExecutiveAnalytics() {
    const [patients, invoices, emergencies, labOrders, radOrders] = await Promise.all([
      patientRepository.findAll({}),
      hospitalBillingRepository.findAll({}),
      emergencyRepository.findAll({}),
      pathologyRepository.findAll({}),
      radiologyRepository.findAll({})
    ]);

    const totalPatients = patients.length;
    const totalErCases = emergencies.length;
    const totalLabOrders = labOrders.length;
    const totalRadOrders = radOrders.length;

    let grossRevenue = 0;
    let totalDiscount = 0;
    let netRevenue = 0;
    let paidAmount = 0;
    let totalDue = 0;

    invoices.forEach(inv => {
      grossRevenue += Number(inv.totalAmount || 0);
      totalDiscount += Number(inv.discount || 0);
      netRevenue += Number(inv.netAmount || 0);
      paidAmount += Number(inv.paidAmount || 0);
      totalDue += Number(inv.dueAmount || 0);
    });

    return {
      metrics: {
        totalPatients,
        totalErCases,
        totalLabOrders,
        totalRadOrders,
        totalInvoices: invoices.length
      },
      financials: {
        grossRevenue,
        totalDiscount,
        netRevenue,
        paidAmount,
        totalDue
      },
      occupancy: {
        totalBeds: 120,
        occupiedBeds: 42,
        occupancyRate: '35%'
      }
    };
  }

  // --- Audit Logs & Security ---
  async listAuditLogs({ search, page = 1, limit = 50 } = {}) {
    let items = await auditLogRepo.findAll({});
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(i => (i.userName || '').toLowerCase().includes(q) || (i.action || '').toLowerCase().includes(q) || (i.resource || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { logs: items, pagination: { total: items.length, page: Number(page), limit: Number(limit) } };
  }

  async logUserAction(user, action, resource, details) {
    const tenantId = getCurrentTenantId();
    return auditLogRepo.create({
      tenantId,
      userId: user?.id || 'SYSTEM',
      userName: user?.name || 'Admin',
      role: user?.role || 'Admin',
      department: user?.department || 'General',
      action,
      resource,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress: '127.0.0.1'
    });
  }

  // --- SMS / WhatsApp Notification Gateway Simulation ---
  async sendNotification(type, recipientPhone, message) {
    console.log(`[NOTIFICATION GATEWAY DISPATCH - ${type.toUpperCase()}] To: ${recipientPhone} | Message: ${message}`);
    return {
      success: true,
      provider: 'Mock Notification Gateway (Twilio/WhatsApp API Ready)',
      recipient: recipientPhone,
      status: 'Sent',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new DigitalServicesService();
