const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { NIGERIA_STATES, ID_CARD_TYPES } = require('../utils/nigeria');

/**
 * User Schema
 * Stores account info, hashed password, role, and ID-verification state.
 * Sensitive government-ID URL is stored encrypted (see utils/encryption.js).
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },

    role: {
      type: String,
      enum: ['user', 'authority', 'admin'],
      default: 'user',
    },

    // Required platform contract fields
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Encrypted ID document URL (contract-friendly field)
    idDocument: {
      type: String,
      default: null,
    },

    // URL stored encrypted; decrypted only when admin reviews it
    governmentIdUrl: {
      type: String,
      default: null,
    },

    governmentIdPublicId: {
      type: String,  // Cloudinary public_id for deletion
      default: null,
    },

    // Encrypted selfie URL used for liveness/face match checks by admin reviewers
    selfieUrl: {
      type: String,
      default: null,
    },

    selfiePublicId: {
      type: String,
      default: null,
    },

    selfieUploadedAt: {
      type: Date,
      default: null,
    },

    // Encrypted ID number submitted with uploaded government ID
    governmentIdNumber: {
      type: String,
      default: null,
    },

    governmentIdNumberLast4: {
      type: String,
      default: null,
    },

    idVerificationStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none',
    },

    verificationProvider: {
      type: String,
      default: null,
    },

    verificationProviderStatus: {
      type: String,
      default: null,
    },

    verificationReference: {
      type: String,
      default: null,
    },

    verificationLastCheckedAt: {
      type: Date,
      default: null,
    },

    verificationDecisionSource: {
      type: String,
      enum: ['system', 'provider', 'admin'],
      default: 'system',
    },

    verificationError: {
      type: String,
      default: null,
    },

    idRejectionReason: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Track failed login attempts to support account lockout
    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    profilePhotoPublicId: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      default: null,
      match: [/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number'],
    },

    idCardType: {
      type: String,
      enum: ID_CARD_TYPES,
      default: null,
    },

    state: {
      type: String,
      enum: NIGERIA_STATES,
      default: 'FCT',
      index: true,
    },

    address: {
      type: String,
      default: null,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Expose safe, non-sensitive verification progress indicators
        ret.hasGovernmentId = Boolean(ret.governmentIdUrl);
        ret.hasVerificationSelfie = Boolean(ret.selfieUrl);

        // Strip sensitive fields from any JSON serialisation
        delete ret.password;
        delete ret.loginAttempts;
        delete ret.lockedUntil;
        delete ret.governmentIdNumber;
        delete ret.governmentIdUrl;
        delete ret.governmentIdPublicId;
        delete ret.selfieUrl;
        delete ret.selfiePublicId;
        return ret;
      },
    },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
userSchema.index({ idVerificationStatus: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });

// ─── Hooks ─────────────────────────────────────────────────────────────────

/** Hash password before saving if it has been modified. */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance methods ──────────────────────────────────────────────────────

/** Compare candidate password against stored hash. */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/** Return true if account is currently locked out. */
userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

module.exports = mongoose.model('User', userSchema);
