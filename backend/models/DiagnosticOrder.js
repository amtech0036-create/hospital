const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiagnosticTest',
      required: true,
    },
    testCode: { type: String, required: true },
    testName: { type: String, required: true },
    department: {
      type: String,
      enum: ['Pathology', 'Radiology', 'Cardiology', 'Other'],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    specimenBarcode: { type: String, required: true },
    sampleStatus: {
      type: String,
      enum: ['pending', 'sample_collected', 'in_processing', 'completed', 'cancelled'],
      default: 'pending',
    },
    sampleCollectedAt: { type: Date },
    sampleCollectedBy: { type: String },
  },
  { _id: true }
);

const diagnosticOrderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    uhid: {
      type: String,
      required: true,
      index: true,
    },
    patientSnapshot: {
      fullName: { type: String, required: true },
      age: { type: String, required: true },
      gender: { type: String, required: true },
      phone: { type: String, required: true },
    },
    orderBarcode: {
      type: String,
      required: true,
      index: true,
    },
    tests: [orderItemSchema],
    financials: {
      totalAmount: { type: Number, required: true, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      taxAmount: { type: Number, default: 0, min: 0 },
      netAmount: { type: Number, required: true, min: 0 },
      paidAmount: { type: Number, default: 0, min: 0 },
      dueAmount: { type: Number, default: 0, min: 0 },
      paymentStatus: {
        type: String,
        enum: ['Paid', 'Partial', 'Unpaid'],
        default: 'Unpaid',
      },
    },
    referredDoctor: {
      name: String,
      contact: String,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

diagnosticOrderSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
diagnosticOrderSchema.index({ tenantId: 1, orderBarcode: 1 });

module.exports = mongoose.model('DiagnosticOrder', diagnosticOrderSchema);
