const express = require('express');
const {
  getStats,
  getAllReports,
  updateReportStatus,
  adminDeleteReport,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  getGovernmentIdUrl,
  getIdentityReviewAssets,
  verifyGovernmentId,
  getAuditLogs,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');
const { adminLimiter }          = require('../middleware/rateLimiter');
const validate                  = require('../middleware/validate');
const {
  statusUpdateValidation,
  verifyGovernmentIdValidation,
  mongoIdParamValidation,
} = require('../utils/validators');

const router = express.Router();

// All admin routes require valid JWT + admin role
router.use(protect, requireAdmin, adminLimiter);

// ─── Dashboard ─────────────────────────────────────────────────────────────
router.get('/stats', getStats);
router.get('/audit-logs', getAuditLogs);
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/read-all', markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', mongoIdParamValidation('id'), validate, markAdminNotificationRead);

// ─── Reports management ────────────────────────────────────────────────────
router.get('/reports',           getAllReports);
router.patch('/reports/:id/status', statusUpdateValidation, validate, updateReportStatus);
router.delete('/reports/:id', mongoIdParamValidation('id'), validate, adminDeleteReport);

// ─── User management ───────────────────────────────────────────────────────
router.get('/users',             getAllUsers);
router.get('/users/:id', mongoIdParamValidation('id'), validate, getUserById);
router.patch('/users/:id/toggle-status', mongoIdParamValidation('id'), validate, toggleUserStatus);

// ─── ID verification ───────────────────────────────────────────────────────
router.get('/users/:id/government-id', mongoIdParamValidation('id'), validate, getGovernmentIdUrl);
router.get('/users/:id/identity-assets', mongoIdParamValidation('id'), validate, getIdentityReviewAssets);
router.patch('/users/:id/verify-id', verifyGovernmentIdValidation, validate, verifyGovernmentId);

module.exports = router;
