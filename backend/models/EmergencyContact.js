const mongoose = require('mongoose');
const { NIGERIA_STATES, INCIDENT_CATEGORIES } = require('../utils/nigeria');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    agency: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    state: {
      type: String,
      required: true,
      enum: NIGERIA_STATES,
      index: true,
    },
    lga: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      enum: INCIDENT_CATEGORIES,
      default: 'public_safety',
      index: true,
    },
    phonePrimary: {
      type: String,
      required: true,
      match: /^\+?[\d\s\-()]{7,20}$/,
    },
    phoneSecondary: {
      type: String,
      default: null,
      match: /^\+?[\d\s\-()]{7,20}$/,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    address: {
      type: String,
      default: null,
      trim: true,
      maxlength: 400,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

emergencyContactSchema.index({ state: 1, category: 1, active: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
