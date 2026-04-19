const User = require('../models/User');
const PremiumUpgradeRequest = require('../models/PremiumUpgradeRequest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/encryption');
const cloudinary  = require('../config/cloudinary');
const { recordAuditLog } = require('../services/auditService');
const { submitIdentityVerification } = require('../services/kycVerificationService');
const {
  signToken,
  buildAuthCookieOptions,
  sanitizeUserForResponse,
} = require('../services/authService');
const { queueNotification } = require('../services/notificationService');

const getPremiumPlanConfigPayload = () => {
  const planAmountRaw = Number(process.env.PREMIUM_PLAN_PRICE_NGN || 5000);
  const amount = Number.isFinite(planAmountRaw) && planAmountRaw > 0 ? planAmountRaw : 5000;

  return {
    planName: 'Premium',
    currency: 'NGN',
    amount,
    streamAccessCodeHint: 'Use approved premium access code after admin verification.',
    bankAccount: {
      accountName: String(process.env.PREMIUM_BANK_ACCOUNT_NAME || 'VOV Crime Premium').trim(),
      accountNumber: String(process.env.PREMIUM_BANK_ACCOUNT_NUMBER || '0000000000').trim(),
      bankName: String(process.env.PREMIUM_BANK_NAME || 'Your Bank Name').trim(),
    },
  };
};

const buildResetPasswordUrl = (resetToken) => {
  const explicitResetBase = String(process.env.RESET_PASSWORD_URL || '').trim();
  if (explicitResetBase) {
    const normalized = explicitResetBase.replace(/\/$/, '');
    return `${normalized}?token=${encodeURIComponent(resetToken)}`;
  }

  const clientBase = String(process.env.CLIENT_URL || 'http://localhost:5175')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');

  return `${clientBase}/reset-password?token=${encodeURIComponent(resetToken)}`;
};

const sendResetPasswordEmail = async ({ toEmail, resetUrl }) => {
  const nodemailer = require('nodemailer');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service is not configured.');
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    to: toEmail,
    from: process.env.EMAIL_USER,
    subject: 'Reset your password',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, you can ignore this message.</p>
    `,
  });
};

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

const getAgeFromDate = (dateInput) => {
  const dob = new Date(dateInput);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
};

const computePendingVerificationStatus = (userDocLike) => {
  const hasGovernmentId = Boolean(userDocLike?.governmentIdUrl);
  const hasSelfie = Boolean(userDocLike?.selfieUrl);
  const isAdult = userDocLike?.isAdult !== false;

  // Adults: require both government ID and selfie.
  // Minors: require selfie only (no government ID upload required).
  if (isAdult) {
    if (hasGovernmentId && hasSelfie) return 'pending';
  } else if (hasSelfie) {
    return 'pending';
  }

  return 'none';
};

const emitAdminOverviewRefresh = (req, reason) => {
  const io = req.app.get('io') || global.__io;
  if (!io) return;

  io.emit('admin:overview-updated', {
    reason,
    at: new Date().toISOString(),
  });
};

const notifyAdmins = async ({ req, type, title, message, payload = {} }) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id name email phone');
    if (!admins.length) return;

    const io = req.app.get('io') || global.__io;

    await Promise.all(
      admins.map(async (admin) => {
        const notification = await queueNotification({
          userId: admin._id,
          channel: 'in_app',
          type,
          title,
          message,
          payload: {
            ...payload,
            audience: 'admin',
            recipients: [{ userId: admin._id, name: admin.name, email: admin.email, phone: admin.phone }],
          },
        });

        if (io) {
          io.to(`user_${String(admin._id)}`).emit('notification', {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            payload: notification.payload,
            createdAt: notification.createdAt,
          });
        }
      })
    );
  } catch {
    // Admin notification failures should not block auth workflows.
  }
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

const buildPremiumRequestPayload = ({ reqBody = {}, userId, submittedVia = 'existing_user', file = null }) => ({
  userId,
  planType: 'premium',
  status: 'pending',
  transferReference: String(reqBody.transferReference || reqBody.premiumTransferReference || '').trim(),
  transferAmount: reqBody.transferAmount || reqBody.premiumTransferAmount ? Number(reqBody.transferAmount || reqBody.premiumTransferAmount) : null,
  transferDate: reqBody.transferDate || reqBody.premiumTransferDate ? new Date(reqBody.transferDate || reqBody.premiumTransferDate) : null,
  senderName: String(reqBody.senderName || reqBody.premiumTransferSenderName || '').trim() || null,
  note: String(reqBody.note || reqBody.premiumTransferNote || '').trim() || null,
  paymentReceiptUrl: file?.path || null,
  paymentReceiptPublicId: file?.filename || null,
  paymentReceiptMimeType: file?.mimetype || null,
  submittedVia,
});

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

    const {
      name,
      email,
      password,
      phone,
      state,
      idCardType,
      dateOfBirth,
      adultConsentAccepted,
      minorConsentAccepted,
      selectedPlan,
      premiumTransferReference,
      premiumTransferAmount,
      premiumTransferDate,
      premiumTransferSenderName,
      premiumTransferNote,
    } = req.body;

    const normalizedSelectedPlan = String(selectedPlan || 'free').trim().toLowerCase() === 'premium' ? 'premium' : 'free';

    const age = getAgeFromDate(dateOfBirth);
    if (age === null) {
      return res.status(400).json({ success: false, message: 'Date of birth is required and must be valid.' });
    }

    const isAdult = age >= 18;
    const adultConsent = toBoolean(adultConsentAccepted);
    const minorConsent = toBoolean(minorConsentAccepted);

    if (isAdult && !adultConsent) {
      return res.status(400).json({
        success: false,
        message: 'Users aged 18 and above must accept consent before registration.',
      });
    }

    if (!isAdult && !minorConsent) {
      return res.status(400).json({
        success: false,
        message: 'Users below 18 must accept minor consent before registration.',
      });
    }

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
      dateOfBirth: new Date(dateOfBirth),
      isAdult,
      adultConsentAccepted: isAdult ? true : false,
      minorConsentAccepted: !isAdult ? true : false,
      idCardType: isAdult ? idCardType : null,
      preferredPlan: normalizedSelectedPlan,
      currentPlan: 'free',
      premiumPlanStatus: 'none',
      premiumPlanActive: false,
    });

    await recordAuditLog({
      req,
      actor: user._id,
      actorRole: user.role,
      action: 'user_registered',
      entityType: 'user',
      entityId: user._id,
      metadata: {
        state: user.state,
        idCardType: user.idCardType,
        isAdult: user.isAdult,
        adultConsentAccepted: user.adultConsentAccepted,
        minorConsentAccepted: user.minorConsentAccepted,
        preferredPlan: user.preferredPlan,
      },
    });

    emitAdminOverviewRefresh(req, 'user-registered');

    await notifyAdmins({
      req,
      type: 'user_registered',
      title: 'New user registered',
      message: `${user.name || 'A new user'} just created an account.`,
      payload: {
        userId: user._id,
        name: user.name,
        email: user.email,
        state: user.state,
        isAdult: user.isAdult,
      },
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

const getPremiumPlanConfig = async (req, res) => {
  return res.status(200).json({ success: true, config: getPremiumPlanConfigPayload() });
};

const requestPremiumUpgrade = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.currentPlan === 'premium' || user.premiumPlanActive === true || user.premiumPlanStatus === 'active') {
      return res.status(400).json({ success: false, message: 'Premium is already active on this account.' });
    }

    const transferReference = String(req.body?.transferReference || '').trim();
    if (!transferReference) {
      return res.status(400).json({ success: false, message: 'Transfer reference is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment receipt upload is required.' });
    }

    const existingPending = await PremiumUpgradeRequest.findOne({
      userId: user._id,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'A premium payment request is already pending admin review.',
      });
    }

    const requestDoc = await PremiumUpgradeRequest.create(
      buildPremiumRequestPayload({ reqBody: req.body, userId: user._id, submittedVia: 'existing_user', file: req.file })
    );

    user.preferredPlan = 'premium';
    await user.save({ validateBeforeSave: false });

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'premium_upgrade_requested',
      entityType: 'premium_upgrade_request',
      entityId: requestDoc._id,
      metadata: {
        transferReference: requestDoc.transferReference,
        transferAmount: requestDoc.transferAmount,
        submittedVia: requestDoc.submittedVia,
      },
    });

    emitAdminOverviewRefresh(req, 'premium-upgrade-requested');

    await notifyAdmins({
      req,
      type: 'premium_upgrade_requested',
      title: 'Premium activation request',
      message: `${user.name || 'A user'} submitted premium transfer details for review.`,
      payload: {
        requestId: requestDoc._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        transferReference: requestDoc.transferReference,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Premium request submitted with receipt. Admin will verify your transfer and activate premium access.',
      request: requestDoc,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not submit premium request.' });
  }
};

const getMyPremiumUpgradeRequest = async (req, res) => {
  try {
    const [request, config] = await Promise.all([
      PremiumUpgradeRequest.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Promise.resolve(getPremiumPlanConfigPayload()),
    ]);

    return res.status(200).json({ success: true, request, config });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not fetch premium request status.' });
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

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────
/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const genericMessage = 'If an account exists for this email, a reset link has been sent.';
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = expiry;
    await user.save({ validateBeforeSave: false });

    const resetUrl = buildResetPasswordUrl(rawToken);

    try {
      await sendResetPasswordEmail({ toEmail: user.email, resetUrl });
    } catch (emailErr) {
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          success: true,
          message: `${genericMessage} (Email service unavailable in local mode. Use resetUrl directly.)`,
          resetUrl,
        });
      }

      console.error('[Auth] forgotPassword email error:', emailErr.message);
    }

    await recordAuditLog({
      req,
      actor: user._id,
      actorRole: user.role,
      action: 'password_reset_requested',
      entityType: 'user',
      entityId: user._id,
      metadata: { email: user.email },
    });

    return res.status(200).json({ success: true, message: genericMessage });
  } catch (err) {
    console.error('[Auth] forgotPassword error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error processing reset request.' });
  }
};

// ─── RESET PASSWORD ──────────────────────────────────────────────────────
/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '').trim();

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password +passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired.' });
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.loginAttempts = 0;
    user.lockedUntil = null;
    await user.save({ validateBeforeSave: false });

    await recordAuditLog({
      req,
      actor: user._id,
      actorRole: user.role,
      action: 'password_reset_completed',
      entityType: 'user',
      entityId: user._id,
      metadata: {},
    });

    return res.status(200).json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) {
    console.error('[Auth] resetPassword error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error while resetting password.' });
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
    if (existingUser?.isAdult === false) {
      return res.status(400).json({
        success: false,
        message: 'Government ID upload is only required for adult accounts.',
      });
    }

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
      isAdult: existingUser?.isAdult,
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

    emitAdminOverviewRefresh(req, 'government-id-uploaded');

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
      isAdult: existingUser?.isAdult,
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

    emitAdminOverviewRefresh(req, 'verification-selfie-uploaded');

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
  forgotPassword,
  resetPassword,
  uploadGovernmentId,
  uploadVerificationSelfie,
  uploadProfilePhoto,
  getPremiumPlanConfig,
  requestPremiumUpgrade,
  getMyPremiumUpgradeRequest,
};
