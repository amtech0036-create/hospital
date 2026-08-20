const mongoose = require('mongoose');

const pathologyResultParamSchema = new mongoose.Schema(
  {
    parameterName: { type: String, required: true },
    resultValue: { type: String, required: true },
    unit: { type: String },
    referenceRange: { type: String },
    isCritical: { type: Boolean, default: false },
    remarks: { type: String },
  },
  { _id: false }
);

const radiologyReportSchema = new mongoose.Schema(
  {
    clinicalHistory: { type: String, trim: true },
    technique: { type: String, trim: true },
    findings: { type: String, trim: true },
    impression: { type: String, trim: true },
    dcmStudyInstanceUID: { type: String, trim: true },
    attachmentUrls: [{ type: String }],
  },
  { _id: false }
);

const diagnosticResultSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiagnosticOrder',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    uhid: {
      type: String,
      required: true,
      index: true,
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiagnosticTest',
      required: true,
    },
    specimenBarcode: {
      type: String,
      index: true,
    },
    department: {
      type: String,
      enum: ['Pathology', 'Radiology', 'Cardiology', 'Other'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sample_collected', 'result_ready', 'authorized'],
      default: 'pending',
      index: true,
    },
    pathologyResults: [pathologyResultParamSchema],
    radiologyReport: radiologyReportSchema,
    enteredBy: {
      type: String,
    },
    enteredAt: {
      type: Date,
    },
    authorizedBy: {
      type: String,
    },
    authorizedAt: {
      type: Date,
    },
    digitalSignature: {
      signatureHash: { type: String },
      signatureUrl: { type: String },
      signedBy: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

diagnosticResultSchema.index({ tenantId: 1, order: 1, test: 1 }, { unique: true });
diagnosticResultSchema.index({ tenantId: 1, status: 1 });
diagnosticResultSchema.index({ tenantId: 1, department: 1, status: 1 });

module.exports = mongoose.model('DiagnosticResult', diagnosticResultSchema);
