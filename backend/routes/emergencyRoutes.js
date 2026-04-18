const express = require('express');
const {
  getEmergencyContacts,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
} = require('../controllers/emergencyController');
const { protect, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { emergencyContactValidation, mongoIdParamValidation } = require('../utils/validators');

const router = express.Router();

// Public read access for citizen safety and emergency discovery
router.get('/', getEmergencyContacts);

// Admin managed CRUD
router.post('/', protect, requireAdmin, emergencyContactValidation, validate, adminCreateEmergencyContact);
router.put('/:id', protect, requireAdmin, mongoIdParamValidation('id'), emergencyContactValidation, validate, adminUpdateEmergencyContact);
router.delete('/:id', protect, requireAdmin, mongoIdParamValidation('id'), validate, adminDeleteEmergencyContact);

module.exports = router;
