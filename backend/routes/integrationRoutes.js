const express = require('express');
const { ingestLawEnforcementCaseUpdate } = require('../controllers/integrationController');

const router = express.Router();

/**
 * Inbound webhook endpoint for trusted law-enforcement systems.
 * Security: x-integration-key header (configured in backend env).
 */
router.post('/law-enforcement/cases', ingestLawEnforcementCaseUpdate);

module.exports = router;
