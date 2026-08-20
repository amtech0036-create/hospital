const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    commissionType: {
      type: String,
      enum: ['Percentage', 'Fixed'],
      default: 'Percentage',
    },
    commissionValue: {
      type: Number,
      default: 10,
    },
    digitalSignatureUrl: {
      type: String,
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

doctorSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
