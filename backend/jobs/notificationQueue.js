/**
 * Asynchronous WhatsApp / SMS Notification Queue Worker
 * Dispatches automated SMS/WhatsApp alerts when clinical reports transition to 'authorized'.
 */

const ReportDeliveryService = require('../services/ReportDeliveryService');
const logger = require('../utils/logger');

class NotificationQueueWorker {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(notificationPayload) {
    this.queue.push({
      ...notificationPayload,
      enqueuedAt: new Date().toISOString()
    });
    logger.info(`[Notification Queue] Enqueued notification for order ${notificationPayload.orderId}`);
    this.processNext();
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const job = this.queue.shift();
    try {
      const result = await ReportDeliveryService.triggerReportReadyNotification(job.orderId, job.tenantId);
      logger.info(`[Notification Queue SUCCESS] Dispatched report ready alert for order ${job.orderId} to ${result.recipientPhone || 'patient'}`);
    } catch (err) {
      logger.error(`[Notification Queue ERROR] Failed for order ${job.orderId}: ${err.message}`);
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), 100);
      }
    }
  }
}

module.exports = new NotificationQueueWorker();
