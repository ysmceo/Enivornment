const mongoose = require('mongoose');

/**
 * ChatMessage Schema
 * Stores messages in real-time chat between users/admins per report.
 * Supports anonymous user messaging. Moderation flags inherited from report.
 */
const chatMessageSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: [true, 'Report ID is required'],
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for anonymous
    },

    senderName: {
      type: String,
      required: [true, 'Sender name required'],
      trim: true,
      maxlength: [100, 'Sender name too long'],
    },

    senderRole: {
      type: String,
      enum: ['user', 'authority', 'admin', 'anonymous'],
      default: 'anonymous',
    },

    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },

    isAnonymous: {
      type: Boolean,
      default: true,
    },

    // Admin-only flags
    flagged: {
      type: Boolean,
      default: false,
    },

    deleted: {
      type: Boolean,
      default: false,
    },

    moderation: {
      provider: { type: String, default: 'heuristic' },
      score: { type: Number, default: 0, min: 0, max: 1 },
      flagged: { type: Boolean, default: false },
      reasons: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
chatMessageSchema.index({ reportId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1 });
chatMessageSchema.index({ flagged: 1 });
chatMessageSchema.index({ 'moderation.flagged': 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

