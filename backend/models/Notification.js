const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'in_app', 'system'],
      default: 'system',
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title too long'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Message too long'],
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed'],
      default: 'queued',
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
