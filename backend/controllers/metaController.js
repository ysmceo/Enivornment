const {
  NIGERIA_STATES,
  ID_CARD_TYPES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  EMERGENCY_TYPES,
} = require('../utils/nigeria');

const getPlatformMetadata = async (_req, res) => {
  res.status(200).json({
    success: true,
    metadata: {
      states: NIGERIA_STATES,
      idCardTypes: ID_CARD_TYPES,
      incidentCategories: INCIDENT_CATEGORIES,
      incidentSeverities: INCIDENT_SEVERITIES,
      emergencyTypes: EMERGENCY_TYPES,
    },
  });
};

module.exports = { getPlatformMetadata };
