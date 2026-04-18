const mongoose = require('mongoose');

/**
 * SOSAlert Schema
 * Emergency one-tap SOS system with continuous live location tracking,
 * auto video streaming, and admin escalation/notifications.
 */
const sosAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    streamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stream',
      default: null, // Optional live video stream
    },

    title: {
      type: String,
      required: [true, 'SOS title required'],
      trim: true,
      maxlength: [200, 'Title too long'],
      default: 'Emergency SOS Alert',
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description too long'],
      default: '',
    },

    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'cancelled'],
      default: 'active',
      index: true,
    },

    // Continuous GPS tracking points [time, lat, lng]
    locationHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        coordinates: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: { type: [Number], required: true }, // [lng, lat]
        },
        speed: { type: Number }, // Optional m/s
        accuracy: { type: Number }, // meters
      },
    ],

    currentLocation: {
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
      updatedAt: { type: Date, default: Date.now },
    },

    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who responded
      default: null,
    },

    acknowledgedAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
sosAlertSchema.index({ userId: 1 });
sosAlertSchema.index({ status: 1 });
sosAlertSchema.index({ 'currentLocation.coordinates': '2dsphere' });
sosAlertSchema.index({ createdAt: -1 });
sosAlertSchema.index({ 'locationHistory.coordinates': '2dsphere' });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);

