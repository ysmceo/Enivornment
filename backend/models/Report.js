const mongoose = require('mongoose');
const { NIGERIA_STATES, INCIDENT_CATEGORIES, INCIDENT_SEVERITIES } = require('../utils/nigeria');
const { randomUUID } = require('crypto');

const generateCaseId = () => {
  const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const uniquePart = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `CASE-${compactDate}-${uniquePart}`;
};

/**
 * Report Schema
 * Stores crime/incident reports submitted by verified users.
 * Media files are stored on Cloudinary; only URLs + public_ids are persisted here.
 */
const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    caseId: {
      type: String,
      unique: true,
      index: true,
      immutable: true,
      default: generateCaseId,
    },

    // Contract field for report owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reporterContact: {
      fullName: {
        type: String,
        trim: true,
        maxlength: [120, 'Full name cannot exceed 120 characters'],
      },
      phone: {
        type: String,
        trim: true,
        maxlength: [30, 'Phone cannot exceed 30 characters'],
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [160, 'Email cannot exceed 160 characters'],
      },
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    incidentDate: {
      type: Date,
      required: [true, 'Incident date is required'],
      validate: {
        validator: (v) => v <= new Date(),
        message: 'Incident date cannot be in the future',
      },
    },

    location: {
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters'],
      },
      // GeoJSON point for future geospatial queries
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },

    category: {
      type: String,
      enum: INCIDENT_CATEGORIES,
      default: 'other',
    },

    severity: {
      type: String,
      enum: INCIDENT_SEVERITIES,
      default: 'medium',
      index: true,
    },

    state: {
      type: String,
      enum: NIGERIA_STATES,
      required: [true, 'State is required'],
      index: true,
    },

    /** Array of uploaded evidence files (photos / videos) */
    media: [
      {
        url: { type: String, required: true },       // Cloudinary secure URL
        publicId: { type: String, required: true },  // Cloudinary public_id
        resourceType: {
          type: String,
          enum: ['image', 'video'],
          required: true,
        },
        originalName: { type: String },
      },
    ],

    // Contract field for lightweight media URL access
    mediaUrls: {
      type: [String],
      default: [],
    },

    evidenceRequests: [
      {
        note: {
          type: String,
          trim: true,
          maxlength: [1000, 'Evidence request note cannot exceed 1000 characters'],
        },
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['open', 'fulfilled', 'cancelled'],
          default: 'open',
        },
        fulfilledAt: {
          type: Date,
          default: null,
        },
        fulfilledBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
    ],

    additionalEvidenceSubmissions: [
      {
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        note: {
          type: String,
          trim: true,
          maxlength: [1000, 'Additional evidence note cannot exceed 1000 characters'],
          default: '',
        },
        media: [
          {
            url: { type: String, required: true },
            publicId: { type: String, required: true },
            resourceType: {
              type: String,
              enum: ['image', 'video'],
              required: true,
            },
            originalName: { type: String },
          },
        ],
        submittedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: ['pending', 'in_progress', 'under_review', 'investigating', 'verified', 'solved', 'resolved', 'rejected', 'closed'],
      default: 'pending',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /** Internal admin notes — never exposed to regular users */
    adminNotes: {
      type: String,
      default: '',
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    isAnonymous: {
      type: Boolean,
      default: false,
    },

    // Tracks status changes over time
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],

    viewCount: {
      type: Number,
      default: 0,
    },

    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    escalation: {
      escalated: { type: Boolean, default: false, index: true },
      level: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
      escalatedAt: { type: Date, default: null },
      escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      resolvedAt: { type: Date, default: null },
    },

    moderation: {
      provider: { type: String, default: 'heuristic' },
      status: { type: String, enum: ['approved', 'flagged', 'blocked'], default: 'approved', index: true },
      flagged: { type: Boolean, default: false },
      score: { type: Number, default: 0 },
      reasons: { type: [String], default: [] },
      confidence: { type: Number, default: 0 },
      flags: { type: [mongoose.Schema.Types.Mixed], default: [] },
      reviewedByAdmin: { type: Boolean, default: false },
      reviewedAt: { type: Date, default: null },
    },

    // Post-case user feedback once the case is completed by admins
    experience: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      journey: {
        type: String,
        trim: true,
        maxlength: [3000, 'Journey feedback cannot exceed 3000 characters'],
        default: '',
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
reportSchema.index({ submittedBy: 1 });
reportSchema.index({ userId: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial
reportSchema.index({ category: 1 });
reportSchema.index({ 'moderation.flagged': 1 });
reportSchema.index({ severity: 1, riskScore: -1 });
reportSchema.index({ 'escalation.escalated': 1, createdAt: -1 });
reportSchema.index({ caseId: 1, createdAt: -1 });
reportSchema.index({ 'evidenceRequests.status': 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
