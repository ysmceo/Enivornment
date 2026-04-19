const EmergencyContact = require('../models/EmergencyContact');
const { createAuditLog } = require('../services/auditService');
const {
  NIGERIA_STATES,
  NIGERIA_REGIONS,
  STATE_TO_REGION,
  EMERGENCY_AUTHORITY_TYPES,
} = require('../utils/nigeria');
const { STATE_CENTROIDS, haversineDistanceKm } = require('../utils/nigeriaGeo');

const STRUCTURED_AUTHORITY_TYPES = ['police', 'civil_defence', 'military'];

const DEFAULT_AGENCY_BY_TYPE = {
  police: 'Nigeria Police Force',
  civil_defence: 'Nigeria Security and Civil Defence Corps',
  military: 'Nigerian Armed Forces / Joint Task Operations',
};

const DEFAULT_HOTLINES_BY_TYPE = {
  police: ['112', '199'],
  civil_defence: ['08057000076'],
  military: ['193'],
};

const UNIVERSAL_ARMED_FORCES_NAME = 'Nigerian Armed Forces (Universal Response)';
const UNIVERSAL_SCOPE = 'national';

const CSV_HEADERS = [
  '_id', 'scope', 'name', 'agency', 'state', 'region', 'authorityType', 'category',
  'phonePrimary', 'phoneSecondary', 'phoneNumbers', 'email', 'address',
  'active', 'isVerifiedOfficial', 'sourceUrl', 'lastVerifiedAt', 'lat', 'lng', 'notes',
];

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_STATE_ALIASES = {
  'Federal Capital Territory': 'FCT',
  Abuja: 'FCT',
};

const isGoogleKeyAvailable = () => GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'replace_me_optional';

const parseNumeric = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const normalizeScope = (value) => (String(value || 'state').toLowerCase() === UNIVERSAL_SCOPE ? UNIVERSAL_SCOPE : 'state');

const isNationalContact = (contact = {}) => normalizeScope(contact.scope || contact.contactScope) === UNIVERSAL_SCOPE;

const normalizeStateName = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const direct = NIGERIA_STATES.find((state) => state.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;

  const alias = GOOGLE_STATE_ALIASES[raw] || GOOGLE_STATE_ALIASES[raw.replace(' State', '').trim()];
  if (alias) return alias;

  const withoutState = raw.replace(/ state$/i, '').trim();
  const bySuffix = NIGERIA_STATES.find((state) => state.toLowerCase() === withoutState.toLowerCase());
  return bySuffix || null;
};

const detectStateFromCoordinates = async (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (isGoogleKeyAvailable()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data?.results) ? data.results : [];

        for (const result of results) {
          const components = Array.isArray(result?.address_components) ? result.address_components : [];
          for (const component of components) {
            const types = component?.types || [];
            if (types.includes('administrative_area_level_1')) {
              const normalized = normalizeStateName(component.long_name) || normalizeStateName(component.short_name);
              if (normalized) return normalized;
            }
          }
        }
      }
    } catch (_err) {
      // fall through to centroid fallback
    }
  }

  const nearestByCentroid = Object.entries(STATE_CENTROIDS)
    .map(([state, centroid]) => ({ state, distanceKm: haversineDistanceKm(lat, lng, centroid.lat, centroid.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return nearestByCentroid?.state || null;
};

const normalizeAuthorityType = (contact = {}) => {
  if (contact.authorityType && EMERGENCY_AUTHORITY_TYPES.includes(contact.authorityType)) return contact.authorityType;
  if (contact.type && EMERGENCY_AUTHORITY_TYPES.includes(contact.type)) return contact.type;

  const candidate = `${contact.agency || ''} ${contact.name || ''}`.toLowerCase();
  if (candidate.includes('civil defence') || candidate.includes('nscdc')) return 'civil_defence';
  if (candidate.includes('military') || candidate.includes('army') || candidate.includes('navy') || candidate.includes('air force')) return 'military';
  if (candidate.includes('police')) return 'police';
  return 'other';
};

const normalizePhoneNumbers = (contact = {}) => {
  const fromArray = Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers : [];
  return [...new Set([
    contact.phonePrimary,
    contact.phoneSecondary,
    contact.phoneNumber,
    contact.alternatePhone,
    ...fromArray,
  ].filter(Boolean))];
};

const normalizeContactOutput = (contact = {}) => {
  const authorityType = normalizeAuthorityType(contact);
  const phoneNumbers = normalizePhoneNumbers(contact);
  const phonePrimary = contact.phonePrimary || contact.phoneNumber || phoneNumbers[0] || null;
  const phoneSecondary = contact.phoneSecondary || contact.alternatePhone || phoneNumbers[1] || null;
  const agencyName = contact.agencyName || contact.agency || contact.name || 'Emergency Authority';
  const scope = normalizeScope(contact.scope);
  const state = scope === UNIVERSAL_SCOPE ? null : contact.state;
  const region = scope === UNIVERSAL_SCOPE
    ? 'National'
    : (contact.region || STATE_TO_REGION[contact.state] || 'North Central');

  return {
    ...contact,
    name: contact.name || agencyName,
    agency: contact.agency || agencyName,
    agencyName,
    scope,
    authorityType,
    type: authorityType,
    state,
    region,
    phonePrimary,
    phoneSecondary,
    phoneNumber: phonePrimary,
    alternatePhone: phoneSecondary,
    phoneNumbers,
    isVirtual: Boolean(contact.isVirtual),
  };
};

const redactPhoneFields = (entry = {}) => {
  const {
    phonePrimary: _phonePrimary,
    phoneSecondary: _phoneSecondary,
    phoneNumber: _phoneNumber,
    alternatePhone: _alternatePhone,
    phoneNumbers: _phoneNumbers,
    ...rest
  } = entry;

  return {
    ...rest,
    phonePrimary: null,
    phoneSecondary: null,
    phoneNumber: null,
    alternatePhone: null,
    phoneNumbers: [],
  };
};

const matchesSearch = (entry, searchLower) => {
  if (!searchLower) return true;
  const haystack = [
    entry.name,
    entry.agency,
    entry.state,
    entry.region,
    entry.authorityType,
    ...(entry.phoneNumbers || []),
  ].filter(Boolean).join(' ').toLowerCase();

  return haystack.includes(searchLower);
};

const buildVirtualEntry = ({ state, authorityType, region }) => {
  const phones = DEFAULT_HOTLINES_BY_TYPE[authorityType] || ['112'];
  return normalizeContactOutput({
    _id: `virtual-${state}-${authorityType}`,
    scope: 'state',
    name: DEFAULT_AGENCY_BY_TYPE[authorityType],
    agency: DEFAULT_AGENCY_BY_TYPE[authorityType],
    agencyName: DEFAULT_AGENCY_BY_TYPE[authorityType],
    state,
    region,
    authorityType,
    type: authorityType,
    category: 'public_safety',
    phonePrimary: phones[0],
    phoneNumber: phones[0],
    phoneSecondary: phones[1] || null,
    alternatePhone: phones[1] || null,
    phoneNumbers: phones,
    email: null,
    address: `${state} State Command HQ`,
    active: true,
    isVerifiedOfficial: true,
    isVirtual: true,
    sourceUrl: null,
  });
};

const buildUniversalArmedForcesEntry = ({ state = null, isVirtual = true } = {}) => {
  const phones = DEFAULT_HOTLINES_BY_TYPE.military || ['193'];
  return normalizeContactOutput({
    _id: isVirtual ? 'virtual-national-military' : undefined,
    scope: UNIVERSAL_SCOPE,
    name: UNIVERSAL_ARMED_FORCES_NAME,
    agency: UNIVERSAL_ARMED_FORCES_NAME,
    agencyName: UNIVERSAL_ARMED_FORCES_NAME,
    state,
    region: 'National',
    authorityType: 'military',
    type: 'military',
    category: 'public_safety',
    phonePrimary: phones[0],
    phoneSecondary: phones[1] || null,
    phoneNumbers: phones,
    active: true,
    isVerifiedOfficial: true,
    isVirtual,
    sourceUrl: null,
  });
};

const deriveCoordinatesForContact = (contact = {}) => {
  const lng = parseNumeric(contact?.location?.coordinates?.[0]);
  const lat = parseNumeric(contact?.location?.coordinates?.[1]);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, source: 'contact' };

  const centroid = STATE_CENTROIDS[contact.state];
  if (!centroid) return null;
  return { lat: centroid.lat, lng: centroid.lng, source: 'state_centroid' };
};

const buildLocationPayload = (body = {}) => {
  const lat = parseNumeric(body.lat ?? body.latitude ?? body?.location?.coordinates?.lat);
  const lng = parseNumeric(body.lng ?? body.longitude ?? body?.location?.coordinates?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  return { type: 'Point', coordinates: [lng, lat] };
};

const normalizeAuthorityTypeQuery = (value) => {
  if (!value || value === 'all') return null;
  return normalizeAuthorityType({ authorityType: String(value), type: String(value) });
};

const buildAdminPayload = (body = {}, userId = null) => {
  const scope = normalizeScope(body.scope || body.contactScope);
  const authorityType = normalizeAuthorityType(body);
  const state = scope === UNIVERSAL_SCOPE ? null : (normalizeStateName(body.state) || body.state);
  const phoneNumbers = Array.isArray(body.phoneNumbers)
    ? [...new Set(body.phoneNumbers.filter(Boolean))]
    : normalizePhoneNumbers(body);

  const defaultNationalName = scope === UNIVERSAL_SCOPE && authorityType === 'military' ? UNIVERSAL_ARMED_FORCES_NAME : undefined;

  const payload = {
    ...body,
    scope,
    name: body.name || body.agencyName || body.agency || defaultNationalName,
    agency: body.agency || body.agencyName || body.name || defaultNationalName,
    state,
    authorityType,
    region: scope === UNIVERSAL_SCOPE ? 'National' : (body.region || STATE_TO_REGION[state] || null),
    phonePrimary: body.phonePrimary || body.phoneNumber || phoneNumbers[0] || null,
    phoneSecondary: body.phoneSecondary || body.alternatePhone || phoneNumbers[1] || null,
    phoneNumbers,
    sourceUrl: body.sourceUrl || body.source || null,
    updatedBy: userId || null,
  };

  const location = buildLocationPayload(body);
  if (location) payload.location = location;

  if (Object.prototype.hasOwnProperty.call(body, 'isVerifiedOfficial')) {
    payload.lastVerifiedAt = body.isVerifiedOfficial ? new Date() : null;
  }

  return payload;
};

const escapeCsvCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const parseCsvLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields.map((cell) => cell.trim());
};

const parseCsvText = (csvText = '') => {
  const text = String(csvText || '').replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });
};

const getEmergencyDirectory = async (req, res) => {
  try {
    const lat = parseNumeric(req.query.lat ?? req.query.latitude);
    const lng = parseNumeric(req.query.lng ?? req.query.longitude);
    const inferredState = (Number.isFinite(lat) && Number.isFinite(lng)) ? await detectStateFromCoordinates(lat, lng) : null;

    const stateFilter = req.query.state && req.query.state !== 'all'
      ? normalizeStateName(String(req.query.state))
      : inferredState;
    const regionFilter = req.query.region && req.query.region !== 'all' ? String(req.query.region) : null;
    const authorityTypeFilter = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);
    const userState = req.query.userState ? String(req.query.userState) : null;
    const searchLower = String(req.query.search || '').trim().toLowerCase();
    const verifiedOnly = String(req.query.verifiedOnly || 'true') === 'true';

    const filter = { active: true };
    if (stateFilter) {
      filter.$or = [
        { state: stateFilter },
        { scope: UNIVERSAL_SCOPE },
      ];
    }
    if (regionFilter) filter.region = regionFilter;
    if (authorityTypeFilter) filter.authorityType = authorityTypeFilter;
    if (verifiedOnly) filter.isVerifiedOfficial = true;

    const dbContacts = await EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).lean();
    const normalizedDbContacts = dbContacts.map((contact) => normalizeContactOutput({ ...contact, isVirtual: false }));

    const statesToInclude = NIGERIA_STATES.filter((state) => {
      const region = STATE_TO_REGION[state] || 'North Central';
      if (stateFilter && state !== stateFilter) return false;
      if (regionFilter && region !== regionFilter) return false;
      return true;
    });

    const authorityTypesToInclude = authorityTypeFilter ? [authorityTypeFilter] : STRUCTURED_AUTHORITY_TYPES;
    const allEntries = normalizedDbContacts.filter((entry) => matchesSearch(entry, searchLower));

    const dbStateTypeCounts = new Set(normalizedDbContacts.map((contact) => `${contact.state}::${contact.authorityType}`));
    const nationalMilitaryExists = normalizedDbContacts.some((entry) => isNationalContact(entry) && entry.authorityType === 'military');

    statesToInclude.forEach((state) => {
      const region = STATE_TO_REGION[state] || 'North Central';
      authorityTypesToInclude.forEach((authorityType) => {
        const key = `${state}::${authorityType}`;
        if (!dbStateTypeCounts.has(key)) {
          const entry = buildVirtualEntry({ state, authorityType, region });
          if (matchesSearch(entry, searchLower)) allEntries.push(entry);
        }
      });
    });

    const shouldIncludeUniversalArmedForces = !authorityTypeFilter || authorityTypeFilter === 'military';
    if (shouldIncludeUniversalArmedForces && !nationalMilitaryExists) {
      const universalEntry = buildUniversalArmedForcesEntry({ state: stateFilter || inferredState || 'FCT', isVirtual: true });
      if (matchesSearch(universalEntry, searchLower)) {
        allEntries.push(universalEntry);
      }
    }

    const nationalContacts = allEntries.filter((entry) => isNationalContact(entry));

    allEntries.sort((a, b) => {
      const aNational = isNationalContact(a) ? 0 : 1;
      const bNational = isNationalContact(b) ? 0 : 1;
      if (aNational !== bNational) return aNational - bNational;
      if (userState) {
        const aScore = a.state === userState ? 0 : 1;
        const bScore = b.state === userState ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
      }
      if (a.state !== b.state) return a.state.localeCompare(b.state);
      return a.authorityType.localeCompare(b.authorityType);
    });

    const groupedByState = statesToInclude
      .map((state) => {
        const scopedItems = allEntries.filter((entry) => entry.state === state);
        const items = [...nationalContacts, ...scopedItems];
        if (!items.length) return null;
        return {
          state,
          region: STATE_TO_REGION[state] || 'North Central',
          contacts: items.map((item) => redactPhoneFields(item)),
        };
      })
      .filter(Boolean);

    const suggestions = [...new Set(
      allEntries.flatMap((entry) => [entry.name, entry.agency]).filter(Boolean).map(String)
    )].slice(0, 20);

    res.status(200).json({
      success: true,
      contacts: allEntries.map((entry) => redactPhoneFields(entry)),
      nationalContacts: nationalContacts.map((entry) => redactPhoneFields(entry)),
      groupedByState,
      states: NIGERIA_STATES,
      regions: NIGERIA_REGIONS,
      authorityTypes: STRUCTURED_AUTHORITY_TYPES,
      suggestions,
      detectedUserState: userState || null,
      inferredState,
      total: allEntries.length,
    });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error fetching emergency contacts.' });
  }
};

const getNearbyAuthorities = async (req, res) => {
  try {
    const lat = parseNumeric(req.query.lat ?? req.query.latitude);
    const lng = parseNumeric(req.query.lng ?? req.query.longitude);
    const radiusKm = Math.max(parseNumeric(req.query.radiusKm) || 250, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
    const verifiedOnly = String(req.query.verifiedOnly || 'true') === 'true';
    const authorityTypeFilter = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    const detectedState = normalizeStateName(req.query.state) || await detectStateFromCoordinates(lat, lng);

    const filter = { active: true };
    if (verifiedOnly) filter.isVerifiedOfficial = true;
    if (authorityTypeFilter) filter.authorityType = authorityTypeFilter;

    const dbContacts = await EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).lean();
    const normalizedContacts = dbContacts.map((contact) => normalizeContactOutput({ ...contact, isVirtual: false }));

    const contactsToMeasure = [...normalizedContacts];
    const hasNationalMilitary = normalizedContacts.some((entry) => isNationalContact(entry) && entry.authorityType === 'military');
    if (detectedState) {
      const stateContacts = normalizedContacts.filter((contact) => contact.state === detectedState);
      const stateTypeSet = new Set(stateContacts.map((contact) => contact.authorityType));
      const fallbackTypes = authorityTypeFilter ? [authorityTypeFilter] : STRUCTURED_AUTHORITY_TYPES;

      fallbackTypes.forEach((authorityType) => {
        if (!stateTypeSet.has(authorityType)) {
          contactsToMeasure.push(buildVirtualEntry({
            state: detectedState,
            authorityType,
            region: STATE_TO_REGION[detectedState] || 'North Central',
          }));
        }
      });
    }

    if ((!authorityTypeFilter || authorityTypeFilter === 'military') && !hasNationalMilitary) {
      contactsToMeasure.push(buildUniversalArmedForcesEntry({ state: detectedState || 'FCT', isVirtual: true }));
    }

    const nearby = contactsToMeasure
      .map((contact) => {
        const coords = deriveCoordinatesForContact(contact);
        if (!coords) return null;
        const distanceKm = haversineDistanceKm(lat, lng, coords.lat, coords.lng);
        return { ...contact, distanceKm: Number(distanceKm.toFixed(2)), distanceSource: coords.source };
      })
      .filter(Boolean)
      .filter((contact) => contact.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      nearby: nearby.map((entry) => redactPhoneFields(entry)),
      detectedState,
      query: { lat, lng, radiusKm, limit },
      total: nearby.length,
    });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error finding nearby authorities.' });
  }
};

const adminListEmergencyContacts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const stateFilter = normalizeStateName(req.query.state);
    const authorityTypeFilter = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);
    const scopeFilter = req.query.scope ? normalizeScope(req.query.scope) : null;

    const filter = {};
    if (stateFilter) filter.state = stateFilter;
    if (authorityTypeFilter) filter.authorityType = authorityTypeFilter;
    if (scopeFilter) filter.scope = scopeFilter;
    if (req.query.region && req.query.region !== 'all') filter.region = req.query.region;
    if (req.query.search) {
      const q = String(req.query.search);
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { agency: { $regex: q, $options: 'i' } },
        { phonePrimary: { $regex: q, $options: 'i' } },
        { phoneSecondary: { $regex: q, $options: 'i' } },
        { phoneNumbers: { $elemMatch: { $regex: q, $options: 'i' } } },
      ];
    }
    if (req.query.active === 'true' || req.query.active === 'false') filter.active = req.query.active === 'true';
    if (req.query.verifiedOnly === 'true' || req.query.verifiedOnly === 'false') filter.isVerifiedOfficial = req.query.verifiedOnly === 'true';

    const [contacts, total] = await Promise.all([
      EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).skip(skip).limit(limit).lean(),
      EmergencyContact.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      contacts: contacts.map((contact) => normalizeContactOutput({ ...contact, isVirtual: false })),
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error fetching admin emergency contacts.' });
  }
};

const adminExportEmergencyContactsCsv = async (req, res) => {
  try {
    const filter = {};
    const stateFilter = normalizeStateName(req.query.state);
    const authorityTypeFilter = normalizeAuthorityTypeQuery(req.query.authorityType || req.query.type);
    const scopeFilter = req.query.scope ? normalizeScope(req.query.scope) : null;

    if (stateFilter) filter.state = stateFilter;
    if (authorityTypeFilter) filter.authorityType = authorityTypeFilter;
    if (scopeFilter) filter.scope = scopeFilter;
    if (req.query.region && req.query.region !== 'all') filter.region = req.query.region;
    if (req.query.active === 'true' || req.query.active === 'false') filter.active = req.query.active === 'true';
    if (req.query.verifiedOnly === 'true' || req.query.verifiedOnly === 'false') filter.isVerifiedOfficial = req.query.verifiedOnly === 'true';

    const contacts = await EmergencyContact.find(filter).sort({ state: 1, authorityType: 1, agency: 1 }).lean();
    const lines = [CSV_HEADERS.join(',')];

    contacts.forEach((rawContact) => {
      const contact = normalizeContactOutput(rawContact);
      const lat = contact?.location?.coordinates?.[1] ?? '';
      const lng = contact?.location?.coordinates?.[0] ?? '';
      const row = [
        contact._id,
        contact.scope || 'state',
        contact.name,
        contact.agency,
        contact.state,
        contact.region,
        contact.authorityType,
        contact.category,
        contact.phonePrimary,
        contact.phoneSecondary,
        (contact.phoneNumbers || []).join('|'),
        contact.email,
        contact.address,
        contact.active,
        contact.isVerifiedOfficial,
        contact.sourceUrl,
        contact.lastVerifiedAt ? new Date(contact.lastVerifiedAt).toISOString() : '',
        lat,
        lng,
        contact.notes,
      ].map(escapeCsvCell);
      lines.push(row.join(','));
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="emergency-contacts-${stamp}.csv"`);
    res.status(200).send(`\uFEFF${lines.join('\n')}`);
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error exporting emergency contacts CSV.' });
  }
};

const adminImportEmergencyContactsCsv = async (req, res) => {
  try {
    const csv = String(req.body?.csv || '');
    const mode = String(req.body?.mode || 'upsert').toLowerCase();
    if (!csv.trim()) return res.status(400).json({ success: false, message: 'CSV content is required.' });

    const rows = parseCsvText(csv);
    if (!rows.length) return res.status(400).json({ success: false, message: 'CSV has no data rows.' });

    const operations = [];
    let skipped = 0;

    rows.forEach((row) => {
      const phoneNumbers = String(row.phoneNumbers || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);

      const payload = buildAdminPayload({
        scope: row.scope,
        name: row.name,
        agency: row.agency,
        state: normalizeStateName(row.state),
        region: row.region,
        authorityType: row.authorityType,
        category: row.category,
        phonePrimary: row.phonePrimary,
        phoneSecondary: row.phoneSecondary,
        phoneNumbers,
        email: row.email,
        address: row.address,
        sourceUrl: row.sourceUrl,
        notes: row.notes,
        active: parseBoolean(row.active, true),
        isVerifiedOfficial: parseBoolean(row.isVerifiedOfficial, true),
        lat: row.lat,
        lng: row.lng,
      }, req.user?._id);

      if (!payload.name || !payload.agency || !payload.phonePrimary || (payload.scope !== UNIVERSAL_SCOPE && !payload.state)) {
        skipped += 1;
        return;
      }

      const identifier = String(row._id || '').trim();
      const filter = identifier
        ? { _id: identifier }
        : {
          scope: payload.scope || 'state',
            state: payload.state,
            agency: payload.agency,
            authorityType: payload.authorityType,
            phonePrimary: payload.phonePrimary,
          };

      operations.push({
        updateOne: {
          filter,
          update: { $set: payload },
          upsert: true,
        },
      });
    });

    if (!operations.length) {
      return res.status(400).json({ success: false, message: 'No valid CSV rows were found to import.', skipped });
    }

    if (mode === 'replace') await EmergencyContact.deleteMany({});

    const result = await EmergencyContact.bulkWrite(operations, { ordered: false });

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.csv_import',
      entityType: 'emergency_contact',
      metadata: {
        mode,
        rows: rows.length,
        operations: operations.length,
        skipped,
        inserted: result.upsertedCount || 0,
        modified: result.modifiedCount || 0,
      },
    });

    const io = req.app.get('io');
    if (io) io.emit('emergency-directory:updated', { action: 'csv_import', mode });

    res.status(200).json({
      success: true,
      message: 'Emergency contacts CSV import completed.',
      summary: {
        mode,
        rows: rows.length,
        operations: operations.length,
        skipped,
        inserted: result.upsertedCount || 0,
        modified: result.modifiedCount || 0,
        matched: result.matchedCount || 0,
      },
    });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error importing emergency contacts CSV.' });
  }
};

const adminCreateEmergencyContact = async (req, res) => {
  try {
    const payload = buildAdminPayload(req.body, req.user?._id);
    const contact = await EmergencyContact.create(payload);

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.create',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { state: contact.state || 'National', category: contact.category, scope: contact.scope || 'state' },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency-directory:updated', {
        action: 'created',
        state: contact.state || 'National',
        authorityType: contact.authorityType,
        contact: normalizeContactOutput(contact.toObject()),
      });
    }

    res.status(201).json({ success: true, message: 'Emergency contact created.', contact: normalizeContactOutput(contact.toObject()) });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error creating contact.' });
  }
};

const adminUpdateEmergencyContact = async (req, res) => {
  try {
    const payload = buildAdminPayload(req.body, req.user?._id);

    const contact = await EmergencyContact.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.update',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { updates: Object.keys(req.body || {}) },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency-directory:updated', {
        action: 'updated',
        state: contact.state,
        authorityType: contact.authorityType,
        contact: normalizeContactOutput(contact.toObject()),
      });
    }

    res.status(200).json({ success: true, message: 'Emergency contact updated.', contact: normalizeContactOutput(contact.toObject()) });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error updating contact.' });
  }
};

const adminDeleteEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    await contact.deleteOne();

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.delete',
      entityType: 'emergency_contact',
      entityId: req.params.id,
      metadata: { state: contact.state, agency: contact.agency },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency-directory:updated', {
        action: 'deleted',
        state: contact.state,
        authorityType: contact.authorityType || normalizeAuthorityType(contact),
      });
    }

    res.status(200).json({ success: true, message: 'Emergency contact deleted.' });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Server error deleting contact.' });
  }
};

module.exports = {
  getEmergencyDirectory,
  getNearbyAuthorities,
  adminListEmergencyContacts,
  adminExportEmergencyContactsCsv,
  adminImportEmergencyContactsCsv,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
};
