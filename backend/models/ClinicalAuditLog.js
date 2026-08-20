const mongoose = require('mongoose');

const clinicalAuditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      default: 'User',
    },
    action: {
      type: String,
      enum: ['VIEW', 'EDIT', 'DELETE', 'AUTHORIZE', 'PRINT', 'BREAK_GLASS'],
      required: true,
    },
    entity: {
      type: String,
      enum: ['Patient', 'DiagnosticOrder', 'DiagnosticResult'],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    details: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

clinicalAuditLogSchema.index({ tenantId: 1, action: 1 });
clinicalAuditLogSchema.index({ tenantId: 1, entity: 1, entityId: 1 });

module.exports = mongoose.model('ClinicalAuditLog', clinicalAuditLogSchema);
