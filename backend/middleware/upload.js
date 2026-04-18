const multer              = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary          = require('../config/cloudinary');

// ─── Allowed MIME types ────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOC_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_DOC_SIZE   = 5  * 1024 * 1024;  // 5 MB

const isPlaceholderValue = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.startsWith('replace_') ||
    normalized.startsWith('your_') ||
    normalized.includes('replace_me') ||
    normalized.includes('your_')
  );
};

const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return ![
    cloudName,
    apiKey,
    apiSecret,
  ].some((item) => isPlaceholderValue(item));
};

const ensureCloudinaryUploadConfigured = (req, res, next) => {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'File upload is not configured yet (Cloudinary keys are placeholders). Please try again later.',
    });
  }

  return next();
};

const ensureGovernmentIdUploadConfigured = (req, res, next) => {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Government ID upload is not configured yet (Cloudinary keys are placeholders). Account creation can still continue.',
    });
  }

  return next();
};

// ─── Helper: build a file filter ──────────────────────────────────────────
const buildFileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

// ─── Government ID upload ─────────────────────────────────────────────────
// Documents uploaded to a restricted Cloudinary folder, raw resource type.
const idStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder:        'crime-reporting/government-ids',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    resource_type: 'auto',
    // Tag with user ID for traceability
    tags:          [`user_${req.user?._id}`],
    access_mode:   'authenticated', // Require signed URLs for access
  }),
});

const uploadGovernmentId = multer({
  storage: idStorage,
  limits:  { fileSize: MAX_DOC_SIZE, files: 1 },
  fileFilter: buildFileFilter(ALLOWED_DOC_TYPES),
}).single('governmentId');

// ─── Verification selfie upload ───────────────────────────────────────────
const selfieStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: 'crime-reporting/verification-selfies',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    tags: [`user_${req.user?._id}`],
    access_mode: 'authenticated',
  }),
});

const uploadSelfie = multer({
  storage: selfieStorage,
  limits: { fileSize: MAX_DOC_SIZE, files: 1 },
  fileFilter: buildFileFilter(ALLOWED_IMAGE_TYPES),
}).single('selfie');

// ─── Profile photo upload ────────────────────────────────────────────────
const profilePhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: 'crime-reporting/profile-photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    tags: [`user_${req.user?._id}`],
  }),
});

const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: buildFileFilter(ALLOWED_IMAGE_TYPES),
}).single('profilePhoto');

// ─── Report media upload ───────────────────────────────────────────────────
// Images and videos; up to 10 files per report.
const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo    = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
    const resourceType = isVideo ? 'video' : 'image';
    return {
      folder:        `crime-reporting/reports/${req.user?._id}`,
      resource_type: resourceType,
      allowed_formats: isVideo ? ['mp4', 'webm', 'mov'] : ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: isVideo
        ? [{ quality: 'auto' }]
        : [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits:  {
    fileSize: MAX_VIDEO_SIZE, // Multer enforces per-file; images are much smaller
    files:    10,
  },
  fileFilter: buildFileFilter([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]),
}).array('media', 10);

// ─── Error handler wrapper ─────────────────────────────────────────────────
/**
 * Wraps a multer middleware so upload errors are forwarded as JSON responses
 * instead of crashing Express.
 */
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, message: 'Too many files (max 10).' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(400).json({ success: false, message: err.message });
  });
};

module.exports = {
  uploadGovernmentId,
  uploadSelfie,
  uploadProfilePhoto,
  uploadMedia,
  handleUpload,
  ensureCloudinaryUploadConfigured,
  ensureGovernmentIdUploadConfigured,
};
