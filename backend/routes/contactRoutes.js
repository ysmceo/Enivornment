'use strict';

// Legacy compatibility shim.
// The active emergency directory router lives in emergencyDirectoryRoutes.js.
module.exports = require('./emergencyDirectoryRoutes');
'use strict';

// Legacy compatibility shim.
// The active emergency directory router lives in emergencyDirectoryRoutes.js.
module.exports = require('./emergencyDirectoryRoutes');
module.exports = require('./emergencyDirectoryRoutes');
module.exports = require('./contactDirectoryRoutes');
const express = require('express');
const { body } = require('express-validator');
const {
  getEmergencyDirectory,
  getNearbyAuthorities,
  adminListEmergencyContacts,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
} = require('../controllers/contactDirectoryController');
const { protect, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { mongoIdParamValidation } = require('../utils/validators');

const router = express.Router();

router.get('/', getEmergencyDirectory);
router.get('/nearby', getNearbyAuthorities);
router.get('/state/:state', (req, _res, next) => {
  req.query.state = req.params.state;
  next();
}, getEmergencyDirectory);

router.get('/admin/all', protect, requireAdmin, adminListEmergencyContacts);

const contactValidation = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('agency').trim().notEmpty().isLength({ max: 150 }),
  body('state').trim().notEmpty(),
  body('region').optional({ nullable: true, checkFalsy: true }).isString(),
  body('authorityType').optional({ nullable: true, checkFalsy: true }).isIn(['police', 'civil_defence', 'military', 'other']),
  body('category').optional().isString(),
  body('phonePrimary').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('phoneNumber').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('phoneSecondary').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('phoneNumbers').optional().isArray({ min: 1, max: 10 }),
  body('phoneNumbers.*').optional().matches(/^\+?[\d\s\-()]{7,20}$/),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  body('active').optional().isBoolean(),
  body('isVerifiedOfficial').optional().isBoolean(),
];

router.post('/', protect, requireAdmin, contactValidation, validate, adminCreateEmergencyContact);
router.put('/:id', protect, requireAdmin, mongoIdParamValidation('id'), contactValidation, validate, adminUpdateEmergencyContact);
router.delete('/:id', protect, requireAdmin, mongoIdParamValidation('id'), validate, adminDeleteEmergencyContact);

module.exports = router;
const express = require('express');
const { body } = require('express-validator');
const {
  getEmergencyDirectory,
  getNearbyAuthorities,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
  adminListEmergencyContacts,
  adminExportEmergencyContactsCsv,
  adminImportEmergencyContactsCsv,
} = require('../controllers/contactController');
} = require('../controllers/emergencyDirectoryController');
} = require('../controllers/contactDirectoryController');
const { protect, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { mongoIdParamValidation } = require('../utils/validators');

const router = express.Router();

router.get('/', getEmergencyDirectory);
router.get('/admin/all', protect, requireAdmin, adminListEmergencyContacts);
router.get('/admin/export-csv', protect, requireAdmin, adminExportEmergencyContactsCsv);
router.post('/admin/import-csv', protect, requireAdmin, adminImportEmergencyContactsCsv);

router.get('/nearby', getNearbyAuthorities);
router.get('/state/:state', (req, _res, next) => {
  req.query.state = req.params.state;
  next();
}, getEmergencyDirectory);
const contactValidation = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('agency').trim().notEmpty().isLength({ max: 150 }),
  body('state').trim().notEmpty(),
  body('region').optional({ nullable: true, checkFalsy: true }).isString(),
  body('authorityType').optional({ nullable: true, checkFalsy: true }).isIn(['police', 'civil_defence', 'military', 'other']),
  body('category').optional().isString(),
  body('phonePrimary').trim().notEmpty().matches(/^\+?[\d\s\-()]{7,20}$/),
  body('phoneSecondary').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('phoneNumbers').optional().isArray({ min: 1, max: 6 }),
  body('phoneNumbers.*').optional().matches(/^\+?[\d\s\-()]{7,20}$/),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  body('active').optional().isBoolean(),
  body('isVerifiedOfficial').optional().isBoolean(),
];

router.post('/', protect, requireAdmin, contactValidation, validate, adminCreateEmergencyContact);
router.put('/:id', protect, requireAdmin, mongoIdParamValidation('id'), contactValidation, validate, adminUpdateEmergencyContact);
router.delete('/:id', protect, requireAdmin, mongoIdParamValidation('id'), validate, adminDeleteEmergencyContact);

module.exports = router;
