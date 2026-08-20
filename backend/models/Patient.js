const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    uhid: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    age: {
      value: { type: Number, required: true },
      unit: { type: String, enum: ['Years', 'Months', 'Days'], default: 'Years' },
    },
    dob: {
      type: Date,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    referredDoctor: {
      name: String,
      hospital: String,
      contact: String,
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

patientSchema.index({ tenantId: 1, uhid: 1 }, { unique: true });
patientSchema.index({ tenantId: 1, phone: 1 });

module.exports = mongoose.model('Patient', patientSchema);
