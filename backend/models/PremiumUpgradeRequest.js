const mongoose = require('mongoose');

const premiumUpgradeRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    planType: {
      type: String,
      enum: ['premium'],
      default: 'premium',
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    transferReference: {
      type: String,
      required: [true, 'Transfer reference is required'],
      trim: true,
      maxlength: [120, 'Transfer reference cannot exceed 120 characters'],
    },

    transferAmount: {
      type: Number,
      default: null,
      min: [0, 'Transfer amount cannot be negative'],
    },

    transferDate: {
      type: Date,
      default: null,
    },

    senderName: {
      type: String,
      default: null,
      trim: true,
      maxlength: [120, 'Sender name cannot exceed 120 characters'],
    },

    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters'],
    },

    paymentReceiptUrl: {
      type: String,
      default: null,
    },

    paymentReceiptPublicId: {
      type: String,
      default: null,
    },

    paymentReceiptMimeType: {
      type: String,
      default: null,
    },

    submittedVia: {
      type: String,
      enum: ['registration', 'existing_user'],
      default: 'existing_user',
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    adminNote: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'Admin note cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

premiumUpgradeRequestSchema.index({ userId: 1, createdAt: -1 });
premiumUpgradeRequestSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

module.exports = mongoose.model('PremiumUpgradeRequest', premiumUpgradeRequestSchema);
