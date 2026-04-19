const express  = require('express');
const { body } = require('express-validator');
const {
  register, login, logout, getMe, updateProfile, changePassword, forgotPassword, resetPassword, uploadGovernmentId, uploadVerificationSelfie, uploadProfilePhoto,
  getPremiumPlanConfig, requestPremiumUpgrade, getMyPremiumUpgradeRequest,
} = require('../controllers/authController');
const { protect }                         = require('../middleware/auth');
const { authLimiter, uploadLimiter }      = require('../middleware/rateLimiter');
const validate                            = require('../middleware/validate');
const {
  uploadGovernmentId: uploadIdMiddleware,
  uploadSelfie: uploadSelfieMiddleware,
  uploadProfilePhoto: uploadProfilePhotoMiddleware,
  uploadPremiumReceipt: uploadPremiumReceiptMiddleware,
  handleUpload,
  ensureCloudinaryUploadConfigured,
  ensureGovernmentIdUploadConfigured,
} = require('../middleware/upload');
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  premiumUpgradeRequestValidation,
} = require('../utils/validators');
const { NIGERIA_STATES } = require('../utils/nigeria');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login',    authLimiter, loginValidation,    validate, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/logout',   protect, logout);
router.get('/premium-config', getPremiumPlanConfig);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/update-profile', [
  body('name').optional().trim().isLength({ max: 100 }),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('state').optional().isIn(NIGERIA_STATES),
], validate, updateProfile);
router.put('/change-password', changePasswordValidation, validate, changePassword);
router.get('/premium/request-status', getMyPremiumUpgradeRequest);
router.post(
  '/premium/upgrade-request',
  ensureCloudinaryUploadConfigured,
  handleUpload(uploadPremiumReceiptMiddleware),
  premiumUpgradeRequestValidation,
  validate,
  requestPremiumUpgrade
);

// Government ID upload — rate-limited and authenticated
router.post(
  '/upload-id',
  uploadLimiter,
  ensureGovernmentIdUploadConfigured,
  handleUpload(uploadIdMiddleware),
  uploadGovernmentId
);

router.post(
  '/upload-selfie',
  uploadLimiter,
  ensureCloudinaryUploadConfigured,
  handleUpload(uploadSelfieMiddleware),
  uploadVerificationSelfie
);

router.post(
  '/upload-profile-photo',
  uploadLimiter,
  ensureCloudinaryUploadConfigured,
  handleUpload(uploadProfilePhotoMiddleware),
  uploadProfilePhoto
);

module.exports = router;
