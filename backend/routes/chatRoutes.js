const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router({ mergeParams: true });

const { protect, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createChatMessage, getChatMessages, deleteChatMessage, flagChatMessage } = require('../controllers/chatController');

// ─── Validators ───────────────────────────────────────────────────────────
const validateReportId = [
  param('reportId').isMongoId().withMessage('Valid report ID required'),
];

const validateMessage = [
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 1000 }).withMessage('Message too long (max 1000 chars)'),
];

const validateFlag = [
  body('reason')
    .trim()
    .notEmpty().withMessage('Flag reason required')
    .isLength({ max: 500 }).withMessage('Reason too long'),
];

// ─── POST /api/chat/:reportId/messages ─────────────────────────────────────
router.post(
  '/:reportId/messages',
  protect,
  validateReportId,
  validateMessage,
  validate,
  createChatMessage
);

// ─── GET /api/chat/:reportId ───────────────────────────────────────────────
router.get(
  '/:reportId',
  protect,
  validateReportId,
  validate,
  getChatMessages
);

// ─── DELETE /api/chat/:messageId ───────────────────────────────────────────
router.delete(
  '/:messageId',
  protect,
  validateReportId, // Reuse for mongoId
  validate,
  deleteChatMessage
);

// ─── POST /api/chat/:messageId/flag (admin only) ──────────────────────────
router.post(
  '/:messageId/flag',
  protect,
  requireAdmin,
  validateFlag,
  validate,
  flagChatMessage
);

module.exports = router;

