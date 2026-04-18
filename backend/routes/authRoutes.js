const express  = require('express');
const { body } = require('express-validator');
const {
  register, login, logout, getMe, updateProfile, changePassword, uploadGovernmentId, uploadVerificationSelfie, uploadProfilePhoto,
} = require('../controllers/authController');
const { protect }                         = require('../middleware/auth');
const { authLimiter, uploadLimiter }      = require('../middleware/rateLimiter');
const validate                            = require('../middleware/validate');
const {
  uploadGovernmentId: uploadIdMiddleware,
  uploadSelfie: uploadSelfieMiddleware,
  uploadProfilePhoto: uploadProfilePhotoMiddleware,
  handleUpload,
  ensureCloudinaryUploadConfigured,
  ensureGovernmentIdUploadConfigured,
} = require('../middleware/upload');
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
} = require('../utils/validators');
const { NIGERIA_STATES } = require('../utils/nigeria');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login',    authLimiter, loginValidation,    validate, login);
router.post('/logout',   protect, logout);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/update-profile', [
  body('name').optional().trim().isLength({ max: 100 }),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('state').optional().isIn(NIGERIA_STATES),
], validate, updateProfile);
router.put('/change-password', changePasswordValidation, validate, changePassword);

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
