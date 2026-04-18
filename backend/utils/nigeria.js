const NIGERIA_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River',
  'Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano',
  'Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun',
  'Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

const NIGERIA_REGIONS = ['North Central', 'North East', 'North West', 'South East', 'South South', 'South West'];

const STATE_TO_REGION = {
  Abia: 'South East',
  Adamawa: 'North East',
  'Akwa Ibom': 'South South',
  Anambra: 'South East',
  Bauchi: 'North East',
  Bayelsa: 'South South',
  Benue: 'North Central',
  Borno: 'North East',
  'Cross River': 'South South',
  Delta: 'South South',
  Ebonyi: 'South East',
  Edo: 'South South',
  Ekiti: 'South West',
  Enugu: 'South East',
  FCT: 'North Central',
  Gombe: 'North East',
  Imo: 'South East',
  Jigawa: 'North West',
  Kaduna: 'North West',
  Kano: 'North West',
  Katsina: 'North West',
  Kebbi: 'North West',
  Kogi: 'North Central',
  Kwara: 'North Central',
  Lagos: 'South West',
  Nasarawa: 'North Central',
  Niger: 'North Central',
  Ogun: 'South West',
  Ondo: 'South West',
  Osun: 'South West',
  Oyo: 'South West',
  Plateau: 'North Central',
  Rivers: 'South South',
  Sokoto: 'North West',
  Taraba: 'North East',
  Yobe: 'North East',
  Zamfara: 'North West',
};

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
const EMERGENCY_AUTHORITY_TYPES = ['police', 'civil_defence', 'military', 'other'];

const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

module.exports = {
  NIGERIA_STATES,
  ID_CARD_TYPES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  EMERGENCY_TYPES,
  EMERGENCY_AUTHORITY_TYPES,
  NIGERIA_REGIONS,
  STATE_TO_REGION,
};
