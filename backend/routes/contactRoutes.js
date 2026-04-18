const express = require('express');
const { body } = require('express-validator');
const {
  getEmergencyDirectory,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
} = require('../controllers/contactController');
const { protect, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { mongoIdParamValidation } = require('../utils/validators');

const router = express.Router();

router.get('/', getEmergencyDirectory);

const contactValidation = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('agency').trim().notEmpty().isLength({ max: 150 }),
  body('state').trim().notEmpty(),
  body('category').optional().isString(),
  body('phonePrimary').trim().notEmpty().matches(/^\+?[\d\s\-()]{7,20}$/),
  body('phoneSecondary').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  body('active').optional().isBoolean(),
];

router.post('/', protect, requireAdmin, contactValidation, validate, adminCreateEmergencyContact);
router.put('/:id', protect, requireAdmin, mongoIdParamValidation('id'), contactValidation, validate, adminUpdateEmergencyContact);
router.delete('/:id', protect, requireAdmin, mongoIdParamValidation('id'), validate, adminDeleteEmergencyContact);

module.exports = router;
