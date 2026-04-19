const { body, param } = require('express-validator');
const {
  NIGERIA_STATES,
  ID_CARD_TYPES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  EMERGENCY_TYPES,
} = require('./nigeria');

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

  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const dob = new Date(value);
      if (Number.isNaN(dob.getTime())) {
        throw new Error('Date of birth must be a valid date');
      }
      if (dob > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),

  body('adultConsentAccepted')
    .optional({ nullable: true })
    .isBoolean().withMessage('adultConsentAccepted must be true or false'),

  body('minorConsentAccepted')
    .optional({ nullable: true })
    .isBoolean().withMessage('minorConsentAccepted must be true or false'),

  body('idCardType')
    .custom((value, { req }) => {
      const age = getAgeFromDate(req.body?.dateOfBirth);
      if (age === null) {
        throw new Error('Date of birth must be a valid date');
      }

      const isAdult = age >= 18;
      const normalizedValue = String(value || '').trim();

      if (isAdult && !normalizedValue) {
        throw new Error('ID card type is required for users aged 18 and above');
      }

      if (normalizedValue && !ID_CARD_TYPES.includes(normalizedValue)) {
        throw new Error('Invalid ID card type');
      }

      if (isAdult) {
        const consent = req.body?.adultConsentAccepted;
        const accepted = consent === true || consent === 'true' || consent === '1' || consent === 1;
        if (!accepted) {
          throw new Error('Users aged 18 and above must accept consent before registration');
        }
      } else {
        const consent = req.body?.minorConsentAccepted;
        const accepted = consent === true || consent === 'true' || consent === '1' || consent === 1;
        if (!accepted) {
          throw new Error('Users below 18 must accept minor consent before registration');
        }
      }

      return true;
    }),

  body('selectedPlan')
    .optional({ nullable: true })
    .isIn(['free', 'premium']).withMessage('selectedPlan must be either free or premium'),

  body('premiumTransferReference')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 4, max: 120 }).withMessage('Premium transfer reference must be between 4 and 120 characters'),

  body('premiumTransferAmount')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Premium transfer amount must be a valid positive amount'),

  body('premiumTransferDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Premium transfer date must be a valid date'),
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

  body(['reporter.fullName', 'reporterFullName'])
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 120 }).withMessage('Full name must be between 2 and 120 characters'),

  body(['reporter.phone', 'reporterPhone'])
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Invalid phone number'),

  body(['reporter.email', 'reporterEmail'])
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

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
    .isIn(['pending','in_progress','under_review','investigating','verified','solved','resolved','rejected','closed'])
    .withMessage('Invalid status value'),
  body('adminNotes').optional().isLength({ max: 2000 }),
];

const caseIdParamValidation = (paramName = 'caseId') => [
  param(paramName)
    .trim()
    .matches(/^CASE-\d{8}-[A-Z0-9]{8}$/)
    .withMessage('Invalid case ID format'),
];

const trackCaseByEmailValidation = [
  body('caseId')
    .trim()
    .matches(/^CASE-\d{8}-[A-Z0-9]{8}$/)
    .withMessage('Invalid case ID format'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
];

const reportExperienceValidation = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('journey')
    .trim()
    .notEmpty().withMessage('Please share your experience journey')
    .isLength({ min: 10, max: 3000 }).withMessage('Journey feedback must be between 10 and 3000 characters'),
];

const requestMoreEvidenceValidation = [
  body('note')
    .trim()
    .notEmpty().withMessage('Evidence request note is required')
    .isLength({ min: 5, max: 1000 }).withMessage('Evidence request note must be between 5 and 1000 characters'),
];

const submitAdditionalEvidenceValidation = [
  body('note')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Additional evidence note cannot exceed 1000 characters'),
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

const premiumUpgradeRequestValidation = [
  body('transferReference')
    .trim()
    .notEmpty().withMessage('Transfer reference is required')
    .isLength({ min: 4, max: 120 }).withMessage('Transfer reference must be between 4 and 120 characters'),
  body('transferAmount')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Transfer amount must be a valid positive amount'),
  body('transferDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Transfer date must be a valid date'),
  body('senderName')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Sender name cannot exceed 120 characters'),
  body('note')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Note cannot exceed 1000 characters'),
];

const premiumUpgradeReviewValidation = [
  body('adminNote')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Admin note cannot exceed 1000 characters'),
  body('reason')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Rejection reason cannot exceed 1000 characters'),
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
  caseIdParamValidation,
  trackCaseByEmailValidation,
  reportExperienceValidation,
  requestMoreEvidenceValidation,
  submitAdditionalEvidenceValidation,
  emergencyContactValidation,
  premiumUpgradeRequestValidation,
  premiumUpgradeReviewValidation,
};
