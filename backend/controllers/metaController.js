const {
  NIGERIA_STATES,
  NIGERIA_REGIONS,
  ID_CARD_TYPES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  EMERGENCY_TYPES,
  EMERGENCY_AUTHORITY_TYPES,
} = require('../utils/nigeria');
const mongoose = require('mongoose');

const isPlaceholderValue = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;

  const blockedTokens = [
    'replace',
    'your_',
    'placeholder',
    'example',
    'dummy',
    'optional',
  ];

  return blockedTokens.some((token) => normalized.includes(token));
};

const getConfigHealth = async (_req, res) => {
  const cloudinary = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };

  const googleServerKey = process.env.GOOGLE_MAPS_API_KEY;
  const jwtSecret = process.env.JWT_SECRET;

  res.status(200).json({
    success: true,
    configHealth: {
      database: {
        configured: Boolean(process.env.MONGO_URI),
        connected: mongoose.connection.readyState === 1,
      },
      cloudinary: {
        configured: !Object.values(cloudinary).some((value) => isPlaceholderValue(value)),
      },
      googleMapsServer: {
        configured: !isPlaceholderValue(googleServerKey),
      },
      auth: {
        jwtConfigured: !isPlaceholderValue(jwtSecret),
      },
    },
  });
};

const getPlatformMetadata = async (_req, res) => {
  res.status(200).json({
    success: true,
    metadata: {
      states: NIGERIA_STATES,
      idCardTypes: ID_CARD_TYPES,
      incidentCategories: INCIDENT_CATEGORIES,
      incidentSeverities: INCIDENT_SEVERITIES,
      emergencyTypes: EMERGENCY_TYPES,
      emergencyAuthorityTypes: EMERGENCY_AUTHORITY_TYPES,
      regions: NIGERIA_REGIONS,
    },
  });
};

module.exports = { getPlatformMetadata, getConfigHealth };
