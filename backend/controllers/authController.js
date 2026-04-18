const User = require('../models/User');
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');
const cloudinary  = require('../config/cloudinary');
const { recordAuditLog } = require('../services/auditService');
const { submitIdentityVerification } = require('../services/kycVerificationService');
const {
  signToken,
  buildAuthCookieOptions,
  sanitizeUserForResponse,
} = require('../services/authService');

const ID_NUMBER_PATTERNS = {
  nin: /^\d{11}$/,
  bvn: /^\d{11}$/,
  passport: /^[A-Za-z0-9]{6,20}$/,
  government_issued_valid_id_card: /^[A-Za-z0-9\-\/]{5,30}$/,
};

const validateIdNumberByType = (idCardType, idCardNumber) => {
  const value = String(idCardNumber || '').trim();
  const matcher = ID_NUMBER_PATTERNS[idCardType];
  if (!matcher) {
    return {
      ok: false,
      message: 'Invalid ID card type selected for verification.',
    };
  }

  if (!matcher.test(value)) {
    if (idCardType === 'nin' || idCardType === 'bvn') {
      return { ok: false, message: `${idCardType.toUpperCase()} must be exactly 11 digits.` };
    }
    if (idCardType === 'passport') {
      return { ok: false, message: 'Passport number must be 6-20 alphanumeric characters.' };
    }
    return { ok: false, message: 'Government ID number format is invalid.' };
  }

  return { ok: true, sanitized: value };
};

const computePendingVerificationStatus = (userDocLike) => {
  const hasGovernmentId = Boolean(userDocLike?.governmentIdUrl);
  const hasSelfie = Boolean(userDocLike?.selfieUrl);

  // Verification can only move to pending review after both artifacts are present
  if (hasGovernmentId && hasSelfie) return 'pending';
  return 'none';
};

const applyProviderVerificationIfReady = async ({ req, user, idCardNumber, governmentIdUrl, selfieUrl }) => {
  if (!user || user.idVerificationStatus !== 'pending') {
    return { user, providerResult: null };
  }

  if (!idCardNumber || !governmentIdUrl || !selfieUrl) {
    return { user, providerResult: null };
  }

  const providerResult = await submitIdentityVerification({
    user,
    idCardType: user.idCardType,
    idCardNumber,
    governmentIdUrl,
    selfieUrl,
  });

  const update = {
    verificationProvider: providerResult.provider || 'dojah',
    verificationProviderStatus: providerResult.providerStatus || null,
    verificationReference: providerResult.reference || null,
    verificationLastCheckedAt: new Date(),
    verificationDecisionSource: providerResult.attempted ? 'provider' : 'system',
    verificationError: providerResult.reason || null,
  };

  if (providerResult.idVerificationStatus && ['pending', 'verified', 'rejected'].includes(providerResult.idVerificationStatus)) {
    update.idVerificationStatus = providerResult.idVerificationStatus;
    update.isVerified = providerResult.idVerificationStatus === 'verified';

    if (providerResult.idVerificationStatus === 'rejected') {
      update.idRejectionReason = providerResult.reason || 'Verification rejected by provider.';
    } else {
      update.idRejectionReason = null;
    }
  }

  const updatedUser = await User.findByIdAndUpdate(user._id, update, { new: true });

  await recordAuditLog({
    req,
    actor: req.user._id,
    actorRole: req.user.role,
    action: 'identity_provider_verification_attempted',
    entityType: 'user',
    entityId: req.user._id,
    metadata: {
      provider: providerResult.provider,
      attempted: providerResult.attempted,
      providerStatus: providerResult.providerStatus,
      idVerificationStatus: updatedUser?.idVerificationStatus,
      reference: providerResult.reference || null,
      httpStatus: providerResult.httpStatus || null,
    },
  });

  return { user: updatedUser, providerResult };
};

// ─── Helper: send token in response ──────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Set httpOnly cookie as a secondary transport (for browsers)
  const cookieOptions = buildAuthCookieOptions();
  res.cookie('token', token, cookieOptions);

  const userData = sanitizeUserForResponse(user);

  res.status(statusCode).json({ success: true, token, user: userData });
};

// ─── REGISTER ────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register
 * Creates a new user account. Password hashed by Mongoose pre-save hook.
 */
const register = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is unavailable. Please start MongoDB and try again.',
      });
    }

    const { name, email, password, phone, state, idCardType } = req.body;

    // Check for duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      state: state || 'FCT',
      idCardType,
    });

    await recordAuditLog({
      req,
      actor: user._id,
      actorRole: user.role,
      action: 'user_registered',
      entityType: 'user',
      entityId: user._id,
      metadata: { state: user.state, idCardType: user.idCardType },
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('[Auth] register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Validates credentials, enforces lockout, returns JWT.
 */
const login = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is unavailable. Please start MongoDB and try again.',
      });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Account lockout check
    if (user.isLocked()) {
      const wait = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account locked. Try again in ${wait} minute(s).`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts; lock after 5
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil   = new Date(Date.now() + 30 * 60 * 1000); // 30-minute lockout
        user.loginAttempts = 0;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }

    // Admin login requires matching secret code as a second factor
    if (user.role === 'admin') {
      const secretCode = String(req.body?.secretCode || '').trim();
      const adminSecret = String(process.env.ADMIN_SECRET || '').trim();
      if (!secretCode || !adminSecret || secretCode !== adminSecret) {
        return res.status(401).json({ success: false, message: 'Invalid admin secret code.' });
      }
    }

    // Reset lockout state on successful login
    user.loginAttempts = 0;
    user.lockedUntil   = null;
    user.lastLogin     = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('[Auth] login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────
/**
 * POST /api/auth/logout
 * Clears the auth cookie (token invalidation is client-side for JWTs).
 */
const logout = (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// ─── GET PROFILE ──────────────────────────────────────────────────────────
/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────
/**
 * PUT /api/auth/update-profile
 * Allows users to update name, phone, and address.
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, state } = req.body;
    const allowed = {};
    if (name)    allowed.name    = name;
    if (phone)   allowed.phone   = phone;
    if (address) allowed.address = address;
    if (state)   allowed.state   = state;

    const user = await User.findByIdAndUpdate(req.user._id, allowed, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────
/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();
    res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPLOAD GOVERNMENT ID ─────────────────────────────────────────────────
/**
 * POST /api/auth/upload-id
 * Handles government ID document upload via Cloudinary.
 * The Cloudinary URL is encrypted before storing in MongoDB.
 */
const uploadGovernmentId = async (req, res) => {
  try {
    const { idCardNumber } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    if (!idCardNumber || !String(idCardNumber).trim()) {
      return res.status(400).json({ success: false, message: 'ID card number is required.' });
    }

    // Delete old ID from Cloudinary if exists
    const existingUser = await User.findById(req.user._id);
    const idNumberCheck = validateIdNumberByType(existingUser?.idCardType, idCardNumber);
    if (!idNumberCheck.ok) {
      return res.status(400).json({ success: false, message: idNumberCheck.message });
    }

    if (existingUser.governmentIdPublicId) {
      await cloudinary.uploader.destroy(existingUser.governmentIdPublicId, { resource_type: 'raw' }).catch(() => {});
    }

    // Encrypt the Cloudinary URL before storing
    const encryptedUrl = encrypt(req.file.path);
    const encryptedIdNumber = encrypt(idNumberCheck.sanitized);
    const idNumberLast4 = idNumberCheck.sanitized.slice(-4);
    const nextStatus = computePendingVerificationStatus({
      governmentIdUrl: encryptedUrl,
      selfieUrl: existingUser?.selfieUrl,
    });

    let user = await User.findByIdAndUpdate(
      req.user._id,
      {
        idDocument:               encryptedUrl,
        governmentIdUrl:          encryptedUrl,
        governmentIdPublicId:     req.file.filename,
        governmentIdNumber:       encryptedIdNumber,
        governmentIdNumberLast4:  idNumberLast4,
        idVerificationStatus:     nextStatus,
        idRejectionReason:        null,
        isVerified:               false,
      },
      { new: true }
    );

    if (user.idVerificationStatus === 'pending') {
      let selfieUrlForProvider = null;
      try {
        selfieUrlForProvider = existingUser?.selfieUrl ? decrypt(existingUser.selfieUrl) : null;
      } catch {
        selfieUrlForProvider = null;
      }

      const providerApplied = await applyProviderVerificationIfReady({
        req,
        user,
        idCardNumber: idNumberCheck.sanitized,
        governmentIdUrl: req.file.path,
        selfieUrl: selfieUrlForProvider,
      });
      user = providerApplied.user || user;
    }

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'government_id_uploaded',
      entityType: 'user',
      entityId: req.user._id,
      metadata: {
        verificationStatus: user.idVerificationStatus,
        idCardType: user.idCardType,
        idNumberLast4,
        hasSelfie: Boolean(user.selfieUrl),
      },
    });

    res.status(200).json({
      success: true,
      message:
        user.idVerificationStatus === 'pending'
          ? 'Government ID uploaded. Verification pending.'
          : 'Government ID uploaded. Please upload a verification selfie to continue.',
      idVerificationStatus: user.idVerificationStatus,
    });
  } catch (err) {
    console.error('[Auth] uploadGovernmentId error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during upload.' });
  }
};

// ─── UPLOAD VERIFICATION SELFIE ───────────────────────────────────────────
/**
 * POST /api/auth/upload-selfie
 * Handles verification selfie upload. URL is encrypted before persistence.
 */
const uploadVerificationSelfie = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No selfie uploaded.' });
    }

    const existingUser = await User.findById(req.user._id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (existingUser.selfiePublicId) {
      await cloudinary.uploader.destroy(existingUser.selfiePublicId, { resource_type: 'image' }).catch(() => {});
    }

    const encryptedSelfieUrl = encrypt(req.file.path);
    const nextStatus = computePendingVerificationStatus({
      governmentIdUrl: existingUser?.governmentIdUrl,
      selfieUrl: encryptedSelfieUrl,
    });

    let user = await User.findByIdAndUpdate(
      req.user._id,
      {
        selfieUrl: encryptedSelfieUrl,
        selfiePublicId: req.file.filename,
        selfieUploadedAt: new Date(),
        idVerificationStatus: nextStatus,
        idRejectionReason: null,
        isVerified: false,
      },
      { new: true }
    );

    if (user.idVerificationStatus === 'pending') {
      let idCardNumberForProvider = null;
      let governmentIdUrlForProvider = null;

      try {
        idCardNumberForProvider = existingUser?.governmentIdNumber ? decrypt(existingUser.governmentIdNumber) : null;
      } catch {
        idCardNumberForProvider = null;
      }

      try {
        governmentIdUrlForProvider = existingUser?.governmentIdUrl ? decrypt(existingUser.governmentIdUrl) : null;
      } catch {
        governmentIdUrlForProvider = null;
      }

      const providerApplied = await applyProviderVerificationIfReady({
        req,
        user,
        idCardNumber: idCardNumberForProvider,
        governmentIdUrl: governmentIdUrlForProvider,
        selfieUrl: req.file.path,
      });
      user = providerApplied.user || user;
    }

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'verification_selfie_uploaded',
      entityType: 'user',
      entityId: req.user._id,
      metadata: {
        verificationStatus: user.idVerificationStatus,
        hasGovernmentId: Boolean(user.governmentIdUrl),
      },
    });

    res.status(200).json({
      success: true,
      message:
        user.idVerificationStatus === 'pending'
          ? 'Selfie uploaded. Verification pending.'
          : 'Selfie uploaded. Please upload your government ID to continue.',
      idVerificationStatus: user.idVerificationStatus,
    });
  } catch (err) {
    console.error('[Auth] uploadVerificationSelfie error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during selfie upload.' });
  }
};

// ─── UPLOAD PROFILE PHOTO ────────────────────────────────────────────────
/**
 * POST /api/auth/upload-profile-photo
 * Uploads profile picture and stores Cloudinary URL on the user account.
 */
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No profile photo uploaded.' });
    }

    const existingUser = await User.findById(req.user._id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (existingUser.profilePhotoPublicId) {
      await cloudinary.uploader.destroy(existingUser.profilePhotoPublicId, { resource_type: 'image' }).catch(() => {});
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        profilePhoto: req.file.path,
        profilePhotoPublicId: req.file.filename,
      },
      { new: true }
    );

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'profile_photo_uploaded',
      entityType: 'user',
      entityId: req.user._id,
      metadata: { hasProfilePhoto: Boolean(user?.profilePhoto) },
    });

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully.',
      profilePhoto: user.profilePhoto,
    });
  } catch (err) {
    console.error('[Auth] uploadProfilePhoto error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during profile photo upload.' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  uploadGovernmentId,
  uploadVerificationSelfie,
  uploadProfilePhoto,
};
