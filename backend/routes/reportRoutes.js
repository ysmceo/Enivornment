const express = require('express');
const {
  createReport, getMyReports, getReportById, updateReport, deleteReport, getMapReports, getMapSummary,
} = require('../controllers/reportController');
const { protect, requireVerified } = require('../middleware/auth');
const { uploadLimiter }            = require('../middleware/rateLimiter');
const { uploadMedia, handleUpload } = require('../middleware/upload');
const validate                     = require('../middleware/validate');
const { reportValidation, mongoIdParamValidation } = require('../utils/validators');

const router = express.Router();

// All report routes require authentication
router.use(protect);

// Submit a new report (requires verified ID + upload rate limit)
router.post(
  '/',
  requireVerified,
  uploadLimiter,
  handleUpload(uploadMedia),
  reportValidation,
  validate,
  createReport
);

// User's own reports
router.get('/my', getMyReports);

// Nigeria-wide map analytics
router.get('/map', getMapReports);
router.get('/map-summary', getMapSummary);

// Single report — ownership enforced inside controller
router.get('/:id', mongoIdParamValidation('id'), validate, getReportById);

// Update pending report
router.put('/:id', mongoIdParamValidation('id'), reportValidation, validate, updateReport);

// Delete pending report
router.delete('/:id', mongoIdParamValidation('id'), validate, deleteReport);

module.exports = router;
