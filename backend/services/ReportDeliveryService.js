const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { diagnosticOrderRepository, diagnosticResultRepository, patientRepository } = require('../repositories');
const logger = require('../utils/logger');

class ReportDeliveryService {
  /**
   * Generates a secure, short-lived cryptographically signed token for report viewing.
   */
  generatePortalToken(orderId, tenantId, expiresIn = '72h') {
    return jwt.sign(
      {
        orderId,
        tenantId,
        type: 'PATIENT_PORTAL_REPORT'
      },
      env.JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * Trigger multi-channel notification (SMS / WhatsApp) upon report authorization.
   */
  async triggerReportReadyNotification(orderId, tenantId) {
    const order = await diagnosticOrderRepository.findById(orderId);
    if (!order) return null;

    const patient = await patientRepository.findOne({ uhid: order.uhid });
    const phone = patient ? patient.phone : order.patientSnapshot?.phone;

    if (!phone) return null;

    const portalToken = this.generatePortalToken(order.id, tenantId || order.tenantId);
    const portalUrl = `/portal/reports/${portalToken}`;

    // Simulated Gateway Payload for SMS & WhatsApp API
    const notificationPayload = {
      recipientPhone: phone,
      patientName: patient ? patient.fullName : order.patientSnapshot?.fullName,
      invoiceNumber: order.invoiceNumber,
      portalToken,
      portalUrl,
      smsMessage: `Dear ${patient ? patient.fullName : 'Patient'}, your diagnostic report (${order.invoiceNumber}) is ready. Download report: ${portalUrl}`,
      whatsappMessage: `*Hospital Diagnostic System*\nHello ${patient ? patient.fullName : 'Patient'},\nYour diagnostic test report for Invoice *${order.invoiceNumber}* has been authorized.\n\n👇 Click link to view/download PDF Report:\n${portalUrl}`
    };

    logger.info(`[SMS/WhatsApp Gateway] Sent report ready notification to ${phone} for invoice ${order.invoiceNumber}`);
    return notificationPayload;
  }

  /**
   * Unauthenticated Token-Secured Public Portal endpoint handler.
   */
  async getReportByPortalToken(token) {
    if (!token) {
      const err = new Error('Portal token is required.');
      err.status = 400;
      throw err;
    }

    let payload = null;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      const error = new Error('Invalid or expired report portal link.');
      error.status = 401;
      throw error;
    }

    if (payload.type !== 'PATIENT_PORTAL_REPORT' || !payload.orderId) {
      const error = new Error('Invalid portal token claims.');
      error.status = 403;
      throw error;
    }

    const order = await diagnosticOrderRepository.findById(payload.orderId);
    if (!order) {
      const error = new Error('Diagnostic report order not found.');
      error.status = 404;
      throw error;
    }

    const patient = await patientRepository.findOne({ uhid: order.uhid });
    const results = await diagnosticResultRepository.findAll({ orderId: order.id });

    return {
      portalToken: token,
      order: {
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        uhid: order.uhid,
        status: order.status,
        createdAt: order.createdAt
      },
      patient: patient || order.patientSnapshot,
      tests: order.tests,
      results: results.map((r) => ({
        testId: r.test || r.testId,
        department: r.department,
        status: r.status,
        pathologyResults: r.pathologyResults || [],
        radiologyReport: r.radiologyReport || {},
        authorizedBy: r.authorizedBy,
        authorizedAt: r.authorizedAt,
        digitalSignature: r.digitalSignature
      }))
    };
  }
}

module.exports = new ReportDeliveryService();
