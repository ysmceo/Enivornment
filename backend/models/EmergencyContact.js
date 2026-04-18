const mongoose = require('mongoose');
const {
  NIGERIA_STATES,
  NIGERIA_REGIONS,
  INCIDENT_CATEGORIES,
  EMERGENCY_AUTHORITY_TYPES,
} = require('../utils/nigeria');

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
    region: {
      type: String,
      enum: NIGERIA_REGIONS,
      default: null,
      index: true,
    },
    authorityType: {
      type: String,
      enum: EMERGENCY_AUTHORITY_TYPES,
      default: 'other',
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
    phoneNumbers: {
      type: [String],
      default: [],
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
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
      },
    },
    sourceUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 800,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerifiedOfficial: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

emergencyContactSchema.index({ state: 1, authorityType: 1, active: 1, createdAt: -1 });
emergencyContactSchema.index({ region: 1, authorityType: 1, active: 1, createdAt: -1 });
emergencyContactSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
