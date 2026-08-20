const mongoose = require('mongoose');

const referenceRangeSchema = new mongoose.Schema(
  {
    gender: {
      type: String,
      enum: ['All', 'Male', 'Female'],
      default: 'All',
    },
    minAge: { type: Number, default: 0 },
    maxAge: { type: Number, default: 120 },
    rangeLow: { type: Number },
    rangeHigh: { type: Number },
    textRange: { type: String },
  },
  { _id: false }
);

const testParameterSchema = new mongoose.Schema(
  {
    parameterName: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    referenceRanges: [referenceRangeSchema],
  },
  { _id: false }
);

const diagnosticTestSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      enum: ['Pathology', 'Radiology', 'Cardiology', 'Other'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sampleType: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    specimenContainer: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    parameters: [testParameterSchema],
    radiologyDetails: {
      modality: {
        type: String,
        enum: ['MRI', 'CT', 'X-Ray', 'USG', 'Mammography', 'N/A'],
        default: 'N/A',
      },
      bodyPart: { type: String, trim: true },
      instructions: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

diagnosticTestSchema.index({ tenantId: 1, code: 1 }, { unique: true });
diagnosticTestSchema.index({ tenantId: 1, department: 1 });

module.exports = mongoose.model('DiagnosticTest', diagnosticTestSchema);
