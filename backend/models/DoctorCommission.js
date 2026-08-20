const mongoose = require('mongoose');

const doctorCommissionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiagnosticOrder',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    uhid: {
      type: String,
      required: true,
    },
    totalOrderAmount: {
      type: Number,
      required: true,
    },
    commissionRate: {
      type: Number,
      default: 10,
    },
    commissionAmount: {
      type: Number,
      required: true,
    },
    payoutStatus: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid',
    },
    paidAt: {
      type: Date,
    },
    paymentReference: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

doctorCommissionSchema.index({ tenantId: 1, doctorName: 1 });
doctorCommissionSchema.index({ tenantId: 1, payoutStatus: 1 });

module.exports = mongoose.model('DoctorCommission', doctorCommissionSchema);
