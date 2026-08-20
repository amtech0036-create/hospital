/**
 * Data Retention & Archival Background Cron Job
 * Periodically archives or purges temporary audit logs and old diagnostic result metadata
 * older than the medical record retention threshold (default 1825 days / 5 years).
 */

const { getDb } = require('../config/mongoClient');
const logger = require('../utils/logger');

async function archiveOldMedicalRecords({ retentionDays = 1825 } = {}) {
  try {
    const db = await getDb();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const auditCol = db.collection('clinical_audit_logs');
    const archiveCol = db.collection('archived_audit_logs');

    // Find logs older than cutoff date
    const oldLogs = await auditCol.find({ createdAt: { $lt: cutoffDate } }).toArray();

    if (oldLogs.length > 0) {
      await archiveCol.insertMany(oldLogs);
      const deleteRes = await auditCol.deleteMany({ createdAt: { $lt: cutoffDate } });
      logger.info(`[Archival Worker] Archived ${deleteRes.deletedCount} audit log records older than ${cutoffDate}`);
    } else {
      logger.info(`[Archival Worker] No outdated medical records found prior to ${cutoffDate.slice(0, 10)}`);
    }

    return { archivedCount: oldLogs.length, cutoffDate };
  } catch (err) {
    logger.error(`[Archival Worker Error] ${err.message}`);
    throw err;
  }
}

module.exports = { archiveOldMedicalRecords };
