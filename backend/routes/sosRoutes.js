const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router({ mergeParams: true });

const { protect, adminAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createSOSAlert,
  updateSOSLocation,
  getActiveSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  cancelSOSAlert,
} = require('../controllers/sosController');

// ─── Validators ───────────────────────────────────────────────────────────
const validateSOSId = [
  param('alertId').isMongoId().withMessage('Valid SOS ID required'),
];

const validateLocation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
];

const validateTitle = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title too long'),
];

const validateDesc = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long'),
];

// ─── POST /api/sos (user) ──────────────────────────────────────────────────
router.post(
  '/',
  protect,
  validateTitle,
  validateDesc,
  validateLocation,
  validate,
  createSOSAlert
);

// ─── PUT /api/sos/:alertId/location (user live update) ─────────────────────
router.put(
  '/:alertId/location',
  protect,
  validateSOSId,
  validateLocation,
  validate,
  updateSOSLocation
);

// ─── GET /api/sos/active (admin dashboard) ─────────────────────────────────
router.get(
  '/active',
  protect,
  adminAuth,
  validate,
  getActiveSOSAlerts
);

// ─── POST /api/sos/:alertId/acknowledge (admin) ────────────────────────────
router.post(
  '/:alertId/acknowledge',
  protect,
  adminAuth,
  validateSOSId,
  validate,
  acknowledgeSOSAlert
);

// ─── POST /api/sos/:alertId/resolve (admin) ────────────────────────────────
router.post(
  '/:alertId/resolve',
  protect,
  adminAuth,
  validateSOSId,
  body('cancelled').optional().isBoolean(),
  validate,
  resolveSOSAlert
);

// ─── POST /api/sos/:alertId/cancel (user) ──────────────────────────────────
router.post(
  '/:alertId/cancel',
  protect,
  validateSOSId,
  validate,
  cancelSOSAlert
);

module.exports = router;

