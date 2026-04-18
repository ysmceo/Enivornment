const { body, param } = require('express-validator');
const {
  NIGERIA_STATES,
  ID_CARD_TYPES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  EMERGENCY_TYPES,
} = require('./nigeria');

// ─── Auth validations ──────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain an uppercase letter, lowercase letter, number, and special character'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Invalid phone number'),

  body('state')
    .notEmpty().withMessage('State is required')
    .isIn(NIGERIA_STATES).withMessage('Invalid Nigerian state'),

  body('idCardType')
    .notEmpty().withMessage('ID card type is required')
    .isIn(ID_CARD_TYPES).withMessage('Invalid ID card type'),
];

const loginValidation = [
  body('email')
    .trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('New password must contain uppercase, lowercase, number, and special character'),
];

// ─── Report validations ────────────────────────────────────────────────────

const reportValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20 and 5000 characters'),

  body('incidentDate')
    .notEmpty().withMessage('Incident date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((val) => {
      if (new Date(val) > new Date()) throw new Error('Incident date cannot be in the future');
      return true;
    }),

  body('location.address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 500 }).withMessage('Address too long'),

  body('category')
    .optional()
    .isIn(INCIDENT_CATEGORIES).withMessage('Invalid category'),

  body('severity')
    .optional()
    .isIn(INCIDENT_SEVERITIES).withMessage('Invalid severity'),

  body('state')
    .notEmpty().withMessage('State is required')
    .isIn(NIGERIA_STATES).withMessage('Invalid Nigerian state'),

  body('location.coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

  body('location.coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
];

// ─── Admin status update ───────────────────────────────────────────────────

const statusUpdateValidation = [
  param('id').isMongoId().withMessage('Invalid report ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending','under_review','investigating','resolved','rejected','closed'])
    .withMessage('Invalid status value'),
  body('adminNotes').optional().isLength({ max: 2000 }),
];

const verifyGovernmentIdValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(['approve', 'reject']).withMessage('Action must be either approve or reject'),
  body('rejectionReason')
    .if(body('action').equals('reject'))
    .notEmpty().withMessage('Rejection reason is required when rejecting ID')
    .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),
];

const mongoIdParamValidation = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
];

const emergencyContactValidation = [
  body('state')
    .notEmpty().withMessage('State is required')
    .isIn(NIGERIA_STATES).withMessage('Invalid Nigerian state'),
  body('agencyName')
    .trim()
    .notEmpty().withMessage('Agency name is required')
    .isLength({ max: 200 }).withMessage('Agency name cannot exceed 200 characters'),
  body('type')
    .notEmpty().withMessage('Emergency type is required')
    .isIn(EMERGENCY_TYPES).withMessage('Invalid emergency type'),
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[\d\s\-()]{5,25}$/).withMessage('Invalid phone number'),
  body('alternatePhone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\+?[\d\s\-()]{5,25}$/).withMessage('Invalid alternate phone number'),
  body('source')
    .trim()
    .notEmpty().withMessage('Official source is required')
    .isLength({ max: 500 }).withMessage('Source cannot exceed 500 characters'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  body('isVerifiedOfficial').optional().isBoolean().withMessage('isVerifiedOfficial must be true/false'),
];

module.exports = {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  reportValidation,
  statusUpdateValidation,
  verifyGovernmentIdValidation,
  mongoIdParamValidation,
  emergencyContactValidation,
};
