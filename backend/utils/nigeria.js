const NIGERIA_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River',
  'Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano',
  'Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun',
  'Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

const ID_CARD_TYPES = [
  'nin',
  'bvn',
  'passport',
  'government_issued_valid_id_card',
];

const INCIDENT_CATEGORIES = [
  'crime',
  'assault',
  'fraud',
  'harassment',
  'domestic_violence',
  'environmental_hazard',
  'infrastructure_failure',
  'disaster',
  'human_safety',
  'unsafe_condition',
  'human_wellbeing',
  'other',
];

const EMERGENCY_TYPES = ['police', 'fire_service', 'ambulance', 'disaster_management', 'disaster_response', 'other'];

const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

module.exports = {
  NIGERIA_STATES,
  ID_CARD_TYPES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  EMERGENCY_TYPES,
};
