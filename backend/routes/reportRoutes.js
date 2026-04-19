const express = require('express');
const {
  createReport,
  getMyReports,
  getReportById,
  trackReportByCaseId,
  trackReportByCaseAndEmail,
  submitReportExperience,
  requestMoreEvidence,
  submitAdditionalEvidence,
  updateReport,
  deleteReport,
  getMapReports,
  getMapSummary,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { uploadLimiter }            = require('../middleware/rateLimiter');
const { uploadMedia, handleUpload } = require('../middleware/upload');
const validate                     = require('../middleware/validate');
const {
  reportValidation,
  reportExperienceValidation,
  requestMoreEvidenceValidation,
  submitAdditionalEvidenceValidation,
  mongoIdParamValidation,
  caseIdParamValidation,
  trackCaseByEmailValidation,
} = require('../utils/validators');

const router = express.Router();

// Public tracking by case code + reporter email
router.post('/track', trackCaseByEmailValidation, validate, trackReportByCaseAndEmail);

// All report routes require authentication
router.use(protect);

// Submit a new report (authenticated users; media upload is rate-limited)
router.post(
  '/',
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

// Track by generated case ID
router.get('/track/:caseId', caseIdParamValidation('caseId'), validate, trackReportByCaseId);

// Single report — ownership enforced inside controller
router.get('/:id', mongoIdParamValidation('id'), validate, getReportById);

// Reporter experience after completion
router.patch('/:id/experience', mongoIdParamValidation('id'), reportExperienceValidation, validate, submitReportExperience);

// Admin requests more evidence from report owner
router.patch('/:id/request-evidence', mongoIdParamValidation('id'), requestMoreEvidenceValidation, validate, requestMoreEvidence);

// Report owner uploads additional evidence files
router.patch(
  '/:id/add-evidence',
  uploadLimiter,
  handleUpload(uploadMedia),
  mongoIdParamValidation('id'),
  submitAdditionalEvidenceValidation,
  validate,
  submitAdditionalEvidence
);

// Update pending report
router.put('/:id', mongoIdParamValidation('id'), reportValidation, validate, updateReport);

// Delete pending report
router.delete('/:id', mongoIdParamValidation('id'), validate, deleteReport);

module.exports = router;
