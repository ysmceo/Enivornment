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
  verifyGovernmentId,
  getAuditLogs,
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
router.patch('/users/:id/verify-id', verifyGovernmentIdValidation, validate, verifyGovernmentId);

module.exports = router;
