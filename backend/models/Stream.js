const mongoose = require('mongoose');

/**
 * Stream Schema
 * Tracks WebRTC live-stream sessions initiated by users.
 * Socket.io handles the real-time signalling; this model persists metadata.
 */
const streamSchema = new mongoose.Schema(
  {
    // Contract field for stream owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Contract field for external stream identifier
    streamId: {
      type: String,
      required: true,
      unique: true,
    },

    // Contract field representing stream state
    active: {
      type: Boolean,
      default: true,
    },

    streamer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'Stream title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },

    accessLevel: {
      type: String,
      enum: ['public', 'premium'],
      default: 'public',
      index: true,
    },

    // Optional: associate stream with an existing report
    linkedReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null,
    },

    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
    },

    // Socket.io room ID used to route signalling messages
    roomId: {
      type: String,
      required: true,
      unique: true,
    },

    viewerCount: {
      type: Number,
      default: 0,
    },

    peakViewerCount: {
      type: Number,
      default: 0,
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    reactionCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    // Duration in seconds calculated when stream ends
    duration: {
      type: Number,
      default: null,
    },

    location: {
      address: { type: String, default: null },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
  },
  {
    timestamps: true,
  }
);

streamSchema.index({ streamer: 1 });
streamSchema.index({ userId: 1 });
streamSchema.index({ status: 1 });
streamSchema.index({ likesCount: -1 });
streamSchema.index({ status: 1, accessLevel: 1, startedAt: -1 });

module.exports = mongoose.model('Stream', streamSchema);
